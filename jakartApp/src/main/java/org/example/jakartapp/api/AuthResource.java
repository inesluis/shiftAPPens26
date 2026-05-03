package org.example.jakartapp.api;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @POST
    @Path("/login")
    public Response login(LoginRequest request) {
        // In a real scenario, this would call Supabase Auth or verify credentials
        // For now, we return a mock success response
        return Response.ok(new AuthResponse("mock-jwt-token", request.email)).build();
    }

    @POST
    @Path("/register")
    public Response register(RegisterRequest request) {
        // Mock register
        return Response.status(Response.Status.CREATED)
                .entity(new AuthResponse("mock-jwt-token", request.email)).build();
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class RegisterRequest {
        public String email;
        public String password;
        public String name;
    }

    public static class AuthResponse {
        public String token;
        public String email;
        public AuthResponse(String token, String email) {
            this.token = token;
            this.email = email;
        }
    }
}
