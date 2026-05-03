package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.dto.PersonalizedRecipeCostResponse;
import org.example.jakartapp.repository.RecipeCostRepository;

import java.util.List;

@Path("/user-recipes")
@Produces(MediaType.APPLICATION_JSON)
public class UserRecipeResource {

    @Inject
    private RecipeCostRepository recipeCostRepository;

    @GET
    @Path("/{id}/costs")
    public Response getUserRecipeCosts(@PathParam("id") Long id) {
        List<PersonalizedRecipeCostResponse> costs = recipeCostRepository.findCostsByUserRecipeId(id);
        return Response.ok(costs).build();
    }
}