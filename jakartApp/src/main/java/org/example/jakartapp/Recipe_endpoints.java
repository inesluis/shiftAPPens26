package org.example.jakartapp;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;


import java.sql.*;
import java.util.ArrayList;


@Path("recipes")
public class Recipe_endpoints {
    @GET
    @Path("/{name}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response add_recipe(String recipe){
        try (Connection conn = DButil.getConnection()){
            String sql = "SELECT * FROM recipes WHERE name = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, recipe);
                ResultSet rs = pstmt.executeQuery();
                ArrayList<String> recipes = new ArrayList<>();
                while (rs.next()) {
                    recipes.add(rs.getString("content"));
                }
            }
            return Response.status(Response.Status.CREATED).entity(recipe).build();
        } catch (SQLException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Database error: " + e.getMessage()).build();
        }
    }
}
