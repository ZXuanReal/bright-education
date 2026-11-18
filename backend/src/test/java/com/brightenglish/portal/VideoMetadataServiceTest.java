package com.brightenglish.portal;

import com.brightenglish.portal.service.VideoMetadataService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoMetadataServiceTest {

    private final VideoMetadataService service = new VideoMetadataService();

    @TempDir
    Path tempDir;

    @Test
    void acceptsMp4Under300Seconds() throws IOException {
        Path mp4 = createSyntheticMp4(tempDir.resolve("valid.mp4"), 1000, 125_000); // 125 seconds
        double duration = service.validateVideoDuration(mp4, "mp4");
        assertThat(duration).isEqualTo(125.0);
    }

    @Test
    void rejectsMp4Over300Seconds() throws IOException {
        Path mp4 = createSyntheticMp4(tempDir.resolve("too_long.mp4"), 1000, 305_000); // 305 seconds
        assertThatThrownBy(() -> service.validateVideoDuration(mp4, "mp4"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Video duration exceeds the 5-minute limit");
    }

    @Test
    void acceptsWebmUnder300SecondsAndRejectsOver300Seconds() throws IOException {
        Path validWebm = createSyntheticEbml(tempDir.resolve("valid.webm"), 180_000.0f); // 180s
        assertThat(service.validateVideoDuration(validWebm, "webm")).isEqualTo(180.0);

        Path longWebm = createSyntheticEbml(tempDir.resolve("long.mkv"), 301_000.0f); // 301s
        assertThatThrownBy(() -> service.validateVideoDuration(longWebm, "mkv"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Video duration exceeds the 5-minute limit");
    }

    @Test
    void acceptsAviUnder300SecondsAndRejectsOver300Seconds() throws IOException {
        // 40,000 us per frame (25 fps) * 2500 frames = 100 seconds
        Path validAvi = createSyntheticAvi(tempDir.resolve("valid.avi"), 40_000, 2_500);
        assertThat(service.validateVideoDuration(validAvi, "avi")).isEqualTo(100.0);

        // 40,000 us per frame (25 fps) * 8000 frames = 320 seconds
        Path longAvi = createSyntheticAvi(tempDir.resolve("long.avi"), 40_000, 8_000);
        assertThatThrownBy(() -> service.validateVideoDuration(longAvi, "avi"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Video duration exceeds the 5-minute limit");
    }

    private Path createSyntheticMp4(Path path, int timescale, int durationUnits) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        DataOutputStream dos = new DataOutputStream(out);

        // ftyp box (16 bytes)
        dos.writeInt(16);
        dos.write("ftyp".getBytes(StandardCharsets.ISO_8859_1));
        dos.write("isom".getBytes(StandardCharsets.ISO_8859_1));
        dos.writeInt(512);

        // moov box (8 + 32 = 40 bytes)
        dos.writeInt(40);
        dos.write("moov".getBytes(StandardCharsets.ISO_8859_1));

        // mvhd box (32 bytes)
        dos.writeInt(32);
        dos.write("mvhd".getBytes(StandardCharsets.ISO_8859_1));
        dos.writeByte(0); // version 0
        dos.writeByte(0);
        dos.writeByte(0);
        dos.writeByte(0);
        dos.writeInt(0); // creation_time
        dos.writeInt(0); // modification_time
        dos.writeInt(timescale);
        dos.writeInt(durationUnits);
        dos.writeInt(0); // reserved

        Files.write(path, out.toByteArray());
        return path;
    }

    private Path createSyntheticEbml(Path path, float durationMs) throws IOException {
        ByteBuffer buf = ByteBuffer.allocate(32).order(ByteOrder.BIG_ENDIAN);
        // EBML magic: 1A 45 DF A3
        buf.put(new byte[]{(byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3});
        buf.put(new byte[]{(byte) 0x84, 0x01, 0x02, 0x03, 0x04});
        // TimestampScale: 2A D7 B1 + size 0x83 + 1_000_000 (0x0F4240)
        buf.put(new byte[]{(byte) 0x2A, (byte) 0xD7, (byte) 0xB1, (byte) 0x83, 0x0F, 0x42, 0x40});
        // Duration: 44 89 + size 0x84 + float
        buf.put(new byte[]{(byte) 0x44, (byte) 0x89, (byte) 0x84});
        buf.putFloat(durationMs);
        Files.write(path, buf.array());
        return path;
    }

    private Path createSyntheticAvi(Path path, int microSecPerFrame, int totalFrames) throws IOException {
        ByteBuffer buf = ByteBuffer.allocate(64).order(ByteOrder.LITTLE_ENDIAN);
        buf.put("RIFF".getBytes(StandardCharsets.ISO_8859_1));
        buf.putInt(56);
        buf.put("AVI ".getBytes(StandardCharsets.ISO_8859_1));
        buf.put("avih".getBytes(StandardCharsets.ISO_8859_1));
        buf.putInt(32);
        buf.putInt(microSecPerFrame);
        buf.putInt(0);
        buf.putInt(0);
        buf.putInt(0);
        buf.putInt(totalFrames);
        Files.write(path, buf.array());
        return path;
    }
}
