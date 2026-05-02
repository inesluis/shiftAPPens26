package org.example.jakartapp.api;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.util.DbUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Path("/ingredients")
public class IngredientResource {

    @GET
    @Path("/{search_name}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getIngredient(@PathParam("search_name") String searchName) {
        try (Connection conn = DbUtil.getConnection()) {
            String sql = "SELECT * FROM ingredients WHERE name = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, searchName);
                ResultSet rs = pstmt.executeQuery();
                List<String> ingredients = new ArrayList<>();
                while (rs.next()) {
                    ingredients.add(rs.getString("name"));
                }
                return Response.ok(ingredients).build();
            }
        } catch (SQLException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Database error: " + e.getMessage()).build();
        }
    }
}
