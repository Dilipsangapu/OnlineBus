package com.OnlineBusBooking.OnlineBus.config;

import com.OnlineBusBooking.OnlineBus.model.User;
import com.OnlineBusBooking.OnlineBus.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserRepository userRepository;

    public SecurityConfig(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // ✅ Map DB role (e.g., AGENT) to ROLE_AGENT for Spring
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            User user = userRepository.findByEmail(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())) // ✅ add prefix
            );
        };
    }

    // ✅ Inject auth manager to wire with Spring's login system
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // ✅ Redirect based on role
    private final AuthenticationSuccessHandler successHandler = (request, response, authentication) -> {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String role = authority.getAuthority();
            System.out.println("Authenticated ROLE: " + role); // ✅ Debug print

            if (role.equals("ROLE_ADMIN")) {
                response.sendRedirect("/admin-dashboard");
                return;
            } else if (role.equals("ROLE_AGENT")) {
                response.sendRedirect("/agent/dashboard"); // ✅ Use actual controller mapping
                return;
            } else if (role.equals("ROLE_USER")) {
                response.sendRedirect("/user-dashboard");
                return;
            }
        }
        response.sendRedirect("/");
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/", "/register", "/login", "/dashboard",
                                "/admin-dashboard", "/agent-dashboard", "/process-login",
                                "/css/**", "/js/**", "/images/**", "/fonts/**",
                                "/buses/update/**", "/buses/edit/**",
                                "/buses/api/search",
                                "/api/auth/**", "/api/agents/**", "/api/buses/**",
                                "/buses/api/**",
                                "/api/routes/**",
                                "/api/search-buses",
                                "/api/seats/**",
                                "/api/schedule/**",
                                "/api/**",
                                "/edit-bus/**", "/agent/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .loginPage("/login")
                        .successHandler(successHandler)
                        .permitAll()
                )
                .logout(logout -> logout
                        .logoutSuccessUrl("/login?logout")
                        .permitAll()
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
