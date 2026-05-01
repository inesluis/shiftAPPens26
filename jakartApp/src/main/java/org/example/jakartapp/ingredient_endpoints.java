package org.example.jakartapp;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.sql.*;

@Path("/ingredients")
public class ingredient_endpoints {
    @GET
    @Path("/{search_name}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response get_ingredient(@PathParam("search_name") String search_name){
        try (Connection conn = DButil.getConnection()) {
            String sql = "SELECT * FROM ingredients WHERE name = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, search_name);
                ResultSet rs = pstmt.executeQuery();
                ArrayList<String> ingredients = new ArrayList<>();
                while (rs.next()) {
                    ingredients.add(rs.getString("name"));
                }
                return Response.status(Response.Status.CREATED).entity(ingredients).build();
            }
        } catch (SQLException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Database error: " + e.getMessage()).build();
        }
    }
}