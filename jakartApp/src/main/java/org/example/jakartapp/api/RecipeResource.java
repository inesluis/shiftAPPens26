package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;
import org.example.jakartapp.service.AiService;
import org.example.jakartapp.util.DbUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Path("recipes")
public class RecipeResource {

    @Inject
    private AiService aiService;

    @GET
    @Path("/{name}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getRecipe(@PathParam("name") String name) {
        try (Connection conn = DbUtil.getConnection()) {
            String sql = "SELECT * FROM recipes WHERE name = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, name);
                ResultSet rs = pstmt.executeQuery();
                List<String> recipes = new ArrayList<>();
                while (rs.next()) {
                    recipes.add(rs.getString("content"));
                }
                return Response.ok(recipes).build();
            }
        } catch (SQLException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Database error: " + e.getMessage()).build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/AiGenerated")
    public RecipeResponse createRecipe(RecipeRequest request) {
        return aiService.generateRecipe(request);
    }

    @GET
    @Path("/TestAI")
    @Produces(MediaType.TEXT_PLAIN)
    public String testAI(@QueryParam("prompt") String prompt) {
        String response = aiService.simplequery(prompt);
        System.out.println(response);
        return response;
    }
}
