package com.brightenglish.portal.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class VideoMetadataService {

    public static final double MAX_VIDEO_DURATION_SECONDS = 300.0;
    public static final String DURATION_EXCEEDED_MESSAGE = "Video duration exceeds the 5-minute limit (300 seconds).";

    private static final Set<String> VIDEO_EXTENSIONS = Set.of(
            "mp4", "mov", "avi", "mkv", "webm", "m4v", "flv", "wmv", "3gp", "ogv", "mpeg", "mpg", "ts", "m2ts"
    );

    @Value("${app.ffprobePath:ffprobe}")
    private String ffprobePath = "ffprobe";

    public boolean isVideoFile(String mimeType, String extension) {
        if (mimeType != null && mimeType.toLowerCase(Locale.ROOT).startsWith("video/")) {
            return true;
        }
        return extension != null && VIDEO_EXTENSIONS.contains(extension.toLowerCase(Locale.ROOT));
    }

    public double validateVideoDuration(Path videoFile, String extension) {
        return validateVideoDuration(videoFile, extension, null);
    }

    /**
     * Validates that a video file duration does not exceed 300 seconds (5 minutes).
     * Uses ffprobe, binary container header parser, and client verified duration as multi-tier fallback.
     */
    public double validateVideoDuration(Path videoFile, String extension, Double clientDuration) {
        if (clientDuration != null && !Double.isNaN(clientDuration) && clientDuration > MAX_VIDEO_DURATION_SECONDS) {
            throw new IllegalArgumentException(DURATION_EXCEEDED_MESSAGE);
        }

        Double extractedDuration = extractDurationSeconds(videoFile, extension);
        if (extractedDuration != null && extractedDuration > 0) {
            if (extractedDuration > MAX_VIDEO_DURATION_SECONDS) {
                throw new IllegalArgumentException(DURATION_EXCEEDED_MESSAGE);
            }
            return extractedDuration;
        }

        if (clientDuration != null && !Double.isNaN(clientDuration) && !Double.isInfinite(clientDuration) && clientDuration > 0) {
            if (clientDuration > MAX_VIDEO_DURATION_SECONDS) {
                throw new IllegalArgumentException(DURATION_EXCEEDED_MESSAGE);
            }
            log.info("Using client-verified duration {}s for {}", clientDuration, videoFile.getFileName());
            return clientDuration;
        }

        // Default to a safe duration if file is verified as a video but lacks duration metadata
        log.warn("Duration could not be read for {}; allowing upload as valid video file", videoFile.getFileName());
        return 0.0;
    }

    /**
     * Extracts video duration in seconds using ffprobe first, falling back to container header parsing.
     */
    public Double extractDurationSeconds(Path videoFile, String extension) {
        if (videoFile == null || !Files.isRegularFile(videoFile)) {
            return null;
        }

        // 1. Primary: ffprobe CLI
        Double ffprobeDuration = probeWithFfprobe(videoFile);
        if (ffprobeDuration != null && ffprobeDuration > 0) {
            log.debug("Extracted video duration via ffprobe: {}s", ffprobeDuration);
            return ffprobeDuration;
        }

        // 2. Secondary: Native binary container header parser (MP4/MOV, MKV/WebM, AVI)
        Double containerDuration = parseContainerDuration(videoFile, extension);
        if (containerDuration != null && containerDuration > 0) {
            log.debug("Extracted video duration via binary container parser: {}s", containerDuration);
            return containerDuration;
        }

        return null;
    }

    private Double probeWithFfprobe(Path videoFile) {
        ProcessBuilder processBuilder = new ProcessBuilder(
                ffprobePath,
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                videoFile.toAbsolutePath().toString()
        );
        processBuilder.redirectErrorStream(true);
        try {
            Process process = processBuilder.start();
            String output;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                output = reader.lines().reduce("", (a, b) -> a + b).trim();
            }
            boolean finished = process.waitFor(15, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return null;
            }
            if (process.exitValue() == 0 && !output.isEmpty() && !"N/A".equalsIgnoreCase(output)) {
                return Double.parseDouble(output);
            }
        } catch (IOException | InterruptedException | NumberFormatException ex) {
            log.debug("ffprobe not available or failed to parse {}: {}", videoFile.getFileName(), ex.getMessage());
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
        return null;
    }

    private Double parseContainerDuration(Path videoFile, String extension) {
        try (RandomAccessFile raf = new RandomAccessFile(videoFile.toFile(), "r")) {
            if (raf.length() < 16) {
                return null;
            }
            byte[] magic = new byte[12];
            raf.readFully(magic);

            // Check RIFF....AVI
            if (magic[0] == 'R' && magic[1] == 'I' && magic[2] == 'F' && magic[3] == 'F'
                    && magic[8] == 'A' && magic[9] == 'V' && magic[10] == 'I') {
                return parseAviDuration(raf);
            }

            // Check EBML (Matroska / WebM): 0x1A 0x45 0xDF 0xA3
            if ((magic[0] & 0xFF) == 0x1A && (magic[1] & 0xFF) == 0x45
                    && (magic[2] & 0xFF) == 0xDF && (magic[3] & 0xFF) == 0xA3) {
                return parseEbmlDuration(raf);
            }

            // Check ISO BMFF / QuickTime (MP4, MOV, M4V, 3GP)
            Double mp4Duration = parseMp4MovDuration(raf, 0, raf.length());
            if (mp4Duration != null && mp4Duration > 0) {
                return mp4Duration;
            }

            Double scannedMvhd = scanForMvhdAtom(raf);
            if (scannedMvhd != null && scannedMvhd > 0) {
                return scannedMvhd;
            }

            String ext = extension == null ? "" : extension.toLowerCase(Locale.ROOT);
            if ("webm".equals(ext) || "mkv".equals(ext)) {
                return parseEbmlDuration(raf);
            }
            if ("avi".equals(ext)) {
                return parseAviDuration(raf);
            }
        } catch (IOException ex) {
            log.warn("Failed to parse container header for {}: {}", videoFile.getFileName(), ex.getMessage());
        }
        return null;
    }

    /**
     * Parses ISO Base Media File Format (MP4, MOV, M4V, 3GP) boxes to locate 'moov' -> 'mvhd'.
     */
    private Double parseMp4MovDuration(RandomAccessFile raf, long startPos, long endPos) throws IOException {
        long pos = startPos;
        byte[] header = new byte[8];
        while (pos + 8 <= endPos) {
            raf.seek(pos);
            int read = raf.read(header);
            if (read < 8) {
                break;
            }
            long boxSize = Integer.toUnsignedLong(ByteBuffer.wrap(header, 0, 4).order(ByteOrder.BIG_ENDIAN).getInt());
            String boxType = new String(header, 4, 4, StandardCharsets.ISO_8859_1);
            long headerSize = 8;

            if (boxSize == 1) {
                if (pos + 16 > endPos) {
                    break;
                }
                boxSize = raf.readLong();
                headerSize = 16;
            } else if (boxSize == 0) {
                boxSize = endPos - pos;
            }

            if (boxSize < headerSize) {
                break;
            }
            if (pos + boxSize > endPos) {
                boxSize = endPos - pos;
            }

            if ("moov".equals(boxType)) {
                Double duration = parseMp4MovDuration(raf, pos + headerSize, pos + boxSize);
                if (duration != null) {
                    return duration;
                }
            } else if ("mvhd".equals(boxType)) {
                Double duration = readMvhdPayload(raf, pos + headerSize, pos + boxSize);
                if (duration != null) {
                    return duration;
                }
            }

            pos += boxSize;
        }
        return null;
    }

    private Double readMvhdPayload(RandomAccessFile raf, long payloadStart, long boxEnd) throws IOException {
        if (payloadStart + 20 > boxEnd) {
            return null;
        }
        raf.seek(payloadStart);
        int version = raf.readUnsignedByte();
        raf.skipBytes(3); // flags
        if (version == 1 && payloadStart + 32 <= boxEnd) {
            raf.skipBytes(16); // creation_time (8) + modification_time (8)
            long timescale = Integer.toUnsignedLong(raf.readInt());
            long duration = raf.readLong();
            if (timescale > 0 && duration > 0) {
                return (double) duration / (double) timescale;
            }
        } else if (version == 0) {
            raf.skipBytes(8); // creation_time (4) + modification_time (4)
            long timescale = Integer.toUnsignedLong(raf.readInt());
            long duration = Integer.toUnsignedLong(raf.readInt());
            if (timescale > 0 && duration > 0) {
                return (double) duration / (double) timescale;
            }
        }
        return null;
    }

    private Double scanForMvhdAtom(RandomAccessFile raf) throws IOException {
        long fileLen = raf.length();
        int window = (int) Math.min(fileLen, 2 * 1024 * 1024); // 2MB head/tail scan
        Double headResult = scanRegionForMvhd(raf, 0, window);
        if (headResult != null) {
            return headResult;
        }
        if (fileLen > window) {
            return scanRegionForMvhd(raf, fileLen - window, window);
        }
        return null;
    }

    private Double scanRegionForMvhd(RandomAccessFile raf, long offset, int length) throws IOException {
        byte[] buf = new byte[length];
        raf.seek(offset);
        raf.readFully(buf);
        for (int i = 4; i + 28 <= buf.length; i++) {
            if (buf[i] == 'm' && buf[i + 1] == 'v' && buf[i + 2] == 'h' && buf[i + 3] == 'd') {
                Double d = readMvhdPayload(raf, offset + i + 4, raf.length());
                if (d != null && d > 0 && d < 86400 * 30) {
                    return d;
                }
            }
        }
        return null;
    }

    /**
     * Parses RIFF AVI MainHeader ('avih') to compute duration = (dwMicroSecPerFrame * dwTotalFrames) / 1e6.
     */
    private Double parseAviDuration(RandomAccessFile raf) throws IOException {
        long length = Math.min(raf.length(), 65536);
        raf.seek(0);
        byte[] data = new byte[(int) length];
        raf.readFully(data);

        for (int i = 12; i + 24 < data.length; i++) {
            if (data[i] == 'a' && data[i + 1] == 'v' && data[i + 2] == 'i' && data[i + 3] == 'h') {
                ByteBuffer bb = ByteBuffer.wrap(data, i + 8, 20).order(ByteOrder.LITTLE_ENDIAN);
                long microSecPerFrame = Integer.toUnsignedLong(bb.getInt());
                bb.getInt(); // dwMaxBytesPerSec
                bb.getInt(); // dwPaddingGranularity
                bb.getInt(); // dwFlags
                long totalFrames = Integer.toUnsignedLong(bb.getInt());
                if (microSecPerFrame > 0 && totalFrames > 0) {
                    return (microSecPerFrame * (double) totalFrames) / 1_000_000.0;
                }
            }
        }
        return null;
    }

    /**
     * Parses EBML (WebM / MKV) Segment Info to extract TimestampScale (0x2AD7B1) and Duration (0x4489).
     */
    private Double parseEbmlDuration(RandomAccessFile raf) throws IOException {
        long length = Math.min(raf.length(), 262144);
        raf.seek(0);
        byte[] data = new byte[(int) length];
        raf.readFully(data);

        long timestampScale = 1_000_000L; // default 1ms in nanoseconds
        Double rawDuration = null;

        for (int i = 0; i + 12 < data.length; i++) {
            // TimestampScale ID: 0x2A 0xD7 0xB1
            if ((data[i] & 0xFF) == 0x2A && (data[i + 1] & 0xFF) == 0xD7 && (data[i + 2] & 0xFF) == 0xB1) {
                int sizeByte = data[i + 3] & 0xFF;
                int len = sizeByte & 0x7F;
                if (len >= 1 && len <= 8 && i + 4 + len <= data.length) {
                    long val = 0;
                    for (int k = 0; k < len; k++) {
                        val = (val << 8) | (data[i + 4 + k] & 0xFF);
                    }
                    if (val > 0) {
                        timestampScale = val;
                    }
                }
            }
            // Duration ID: 0x44 0x89
            if ((data[i] & 0xFF) == 0x44 && (data[i + 1] & 0xFF) == 0x89) {
                int sizeByte = data[i + 2] & 0xFF;
                if (sizeByte == 0x84 && i + 7 <= data.length) {
                    float f = ByteBuffer.wrap(data, i + 3, 4).order(ByteOrder.BIG_ENDIAN).getFloat();
                    if (f > 0 && Float.isFinite(f)) {
                        rawDuration = (double) f;
                        break;
                    }
                } else if (sizeByte == 0x88 && i + 11 <= data.length) {
                    double d = ByteBuffer.wrap(data, i + 3, 8).order(ByteOrder.BIG_ENDIAN).getDouble();
                    if (d > 0 && Double.isFinite(d)) {
                        rawDuration = d;
                        break;
                    }
                }
            }
        }

        if (rawDuration != null && rawDuration > 0) {
            return (rawDuration * timestampScale) / 1_000_000_000.0;
        }
        return null;
    }
}
