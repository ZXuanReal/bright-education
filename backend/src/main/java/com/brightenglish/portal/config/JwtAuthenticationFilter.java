package com.brightenglish.portal.config;

import com.brightenglish.portal.security.JwtService;
import com.brightenglish.portal.security.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsServiceImpl userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = authHeader.substring(7);
            if (jwtService.validateJwtToken(token)) {
                try {
                    String email = jwtService.getEmailFromToken(token);
                    // Authorities are always reloaded from the database (never trusted from the token),
                    // so when an ADMIN grants/revokes TEACHER or disables an account, the change applies
                    // on the very next request even if the old JWT has not expired yet.
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                    if (userDetails.isEnabled() && userDetails.isAccountNonLocked()) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                } catch (UsernameNotFoundException ignored) {
                    // Account was deleted after the token was issued: treat the request as unauthenticated (401).
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
