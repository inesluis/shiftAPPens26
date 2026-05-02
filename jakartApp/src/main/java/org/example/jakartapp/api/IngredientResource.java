package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.entity.Ingredient;
import org.example.jakartapp.repository.IngredientRepository;

import java.util.List;

@Path("/ingredients")
@Produces(MediaType.APPLICATION_JSON)
public class IngredientResource {

    @Inject
    private IngredientRepository ingredientRepository;

    @GET
    public Response getAllIngredients() {
        List<Ingredient> ingredients = ingredientRepository.findAll();
        return Response.ok(ingredients).build();
    }

    @GET
    @Path("/search")
    public Response searchIngredients(@QueryParam("term") String term) {
        List<Ingredient> ingredients = ingredientRepository.search(term);
        return Response.ok(ingredients).build();
    }
}