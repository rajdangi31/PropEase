package com.propease.security;

import com.propease.entity.Profile;
import com.propease.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final ProfileRepository profileRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Profile profile = profileRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return new User(
                profile.getEmail(),
                profile.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + profile.getRole().name()))
        );
    }

    public UserDetails loadUserById(java.util.UUID id) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        return new User(
                profile.getEmail(),
                profile.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + profile.getRole().name()))
        );
    }
}
