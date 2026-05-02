package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.entity.RecipeIngredient;
import org.example.jakartapp.repository.RecipeIngredientRepository;

import java.util.List;

@Path("/recipe-ingredients")
@Produces(MediaType.APPLICATION_JSON)
public class RecipeIngredientResource {

    @Inject
    private RecipeIngredientRepository repo;

    @GET
    @Path("/recipe/{recipeId}")
    public Response byRecipe(@PathParam("recipeId") Long recipeId) {
        List<RecipeIngredient> list = repo.findByRecipeId(recipeId);
        return Response.ok(list).build();
    }
}
