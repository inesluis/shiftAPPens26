package org.example.jakartapp.dto;

import org.example.jakartapp.entity.Recipe;
import org.example.jakartapp.entity.UserRecipe;
import java.util.List;

public record RecipeDetailResponse(
    Recipe recipe,
    UserRecipe userRecipe,
    List<IngredientDetail> ingredients,
    List<RecipeCostResponse> costs
) {
    public record IngredientDetail(
        Long ingredientId,
        String name,
        String quantity
    ) {}
}
