package org.example.jakartapp.dto;

public record MissingIngredientResponse(
        Long ingredientId,
        String ingredientName
) {
}
