package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.dto.RecipeCostResponse;
import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;
import org.example.jakartapp.entity.Recipe;
import org.example.jakartapp.repository.RecipeCostRepository;
import org.example.jakartapp.repository.RecipeRepository;
import org.example.jakartapp.service.AiService;

import java.util.List;

@Path("/recipes")
@Produces(MediaType.APPLICATION_JSON)
public class RecipeResource {

    @Inject
    private RecipeRepository recipeRepository;

    @Inject
    private RecipeCostRepository recipeCostRepository;

    @Inject
    private AiService aiService;

    @GET
    public Response getAllRecipes() {
        List<Recipe> recipes = recipeRepository.findAll();
        return Response.ok(recipes).build();
    }

    @GET
    @Path("/{id}")
    public Response getRecipeById(@PathParam("id") Long id) {
        Recipe r = recipeRepository.findById(id);
        if (r == null) return Response.status(Response.Status.NOT_FOUND).build();
        return Response.ok(r).build();
    }

    @GET
    @Path("/search")
    public Response searchRecipes(@QueryParam("term") String term) {
        List<Recipe> recipes = recipeRepository.searchByName(term);
        return Response.ok(recipes).build();
    }

    @GET
    @Path("/{id}/costs")
    public Response getRecipeCosts(@PathParam("id") Long id) {
        Recipe recipe = recipeRepository.findById(id);
        if (recipe == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<RecipeCostResponse> costs = recipeCostRepository.findCostsByRecipeId(id);
        return Response.ok(costs).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public RecipeResponse createRecipe(RecipeRequest request) {
        return aiService.generateRecipe(request);
    }
}
