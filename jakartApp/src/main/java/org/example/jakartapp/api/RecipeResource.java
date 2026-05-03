package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.dto.RecipeCostResponse;
import org.example.jakartapp.dto.RecipeCostWithProductsResponse;
import org.example.jakartapp.dto.RecipeDetailResponse;
import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;
import org.example.jakartapp.entity.Recipe;
import org.example.jakartapp.entity.UserRecipe;
import org.example.jakartapp.repository.*;
import org.example.jakartapp.service.AiService;

import java.util.List;

@Path("/recipes")
@Produces(MediaType.APPLICATION_JSON)
public class RecipeResource {

    @Inject
    private RecipeRepository recipeRepository;

    @Inject
    private UserRecipeRepository userRecipeRepository;

    @Inject
    private RecipeIngredientRepository recipeIngredientRepository;

    @Inject
    private IngredientRepository ingredientRepository;

    @Inject
    private UserRecipeProductRepository userRecipeProductRepository;

    @Inject
    private RecipeCostRepository recipeCostRepository;

    @Inject
    private AiService aiService;

    @GET
    public Response getAllRecipes(@QueryParam("userId") String userId) {
        List<Recipe> curated = recipeRepository.findAll();
        List<UserRecipe> userRecipes = List.of();
        if (userId != null && !userId.isBlank()) {
            try {
                java.util.UUID uuid = java.util.UUID.fromString(userId);
                userRecipes = userRecipeRepository.findByUserId(uuid);
            } catch (IllegalArgumentException e) {
                // Ignore invalid UUID
            }
        }
        return Response.ok(new RecipeListResponse(curated, userRecipes)).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addRecipe(UserRecipe recipe) {
        UserRecipe saved = userRecipeRepository.save(recipe);
        return Response.status(Response.Status.CREATED).entity(saved).build();
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateRecipe(@PathParam("id") Long id, UserRecipe recipe) {
        recipe.setUserRecipeId(id);
        UserRecipe updated = userRecipeRepository.save(recipe);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteRecipe(@PathParam("id") Long id) {
        userRecipeRepository.delete(id);
        return Response.noContent().build();
    }

    public static class RecipeListResponse {
        public List<Recipe> curated;
        public List<UserRecipe> user;
        public RecipeListResponse(List<Recipe> curated, List<UserRecipe> user) {
            this.curated = curated;
            this.user = user;
        }
    }

    @GET
    @Path("/{id}")
    public Response getRecipeById(@PathParam("id") Long id, @QueryParam("isCustom") @DefaultValue("false") boolean isCustom) {
        if (isCustom) {
            UserRecipe ur = userRecipeRepository.findById(id);
            if (ur == null) return Response.status(Response.Status.NOT_FOUND).build();
            
            // For user recipes, get ingredients from UserRecipeProduct
            List<org.example.jakartapp.entity.UserRecipeProduct> products = userRecipeProductRepository.findByUserRecipeId(id);
            List<RecipeDetailResponse.IngredientDetail> ingredientDetails = products.stream().map(urp -> 
                new RecipeDetailResponse.IngredientDetail(
                    urp.getProductId(),
                    urp.getProductId().toString(),
                    urp.getQuantity()
                )
            ).toList();
            
            return Response.ok(new RecipeDetailResponse(null, ur, ingredientDetails, List.of())).build();
        } else {
            Recipe r = recipeRepository.findById(id);
            if (r == null) return Response.status(Response.Status.NOT_FOUND).build();
            
            // Get ingredients for the recipe
            List<org.example.jakartapp.entity.RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipeId(id);
            List<RecipeDetailResponse.IngredientDetail> ingredientDetails = ingredients.stream().map(ri -> {
                org.example.jakartapp.entity.Ingredient ing = ingredientRepository.findById(ri.getIngredientId());
                return new RecipeDetailResponse.IngredientDetail(
                    ri.getIngredientId(),
                    ing != null ? ing.getIngredientName() : "Unknown",
                    ri.getIngredientQuantity()
                );
            }).toList();
            
            List<RecipeCostResponse> costs = recipeCostRepository.findCostsByRecipeId(id);
            return Response.ok(new RecipeDetailResponse(r, null, ingredientDetails, costs)).build();
        }
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

    @GET
    @Path("/{id}/costs/detailed")
    public Response getRecipeCostsDetailed(@PathParam("id") Long id) {
        Recipe recipe = recipeRepository.findById(id);
        if (recipe == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<RecipeCostWithProductsResponse> costs = recipeCostRepository.findCostsByRecipeIdWithProducts(id);
        return Response.ok(costs).build();
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
