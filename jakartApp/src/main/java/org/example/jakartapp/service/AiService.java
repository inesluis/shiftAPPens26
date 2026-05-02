package org.example.jakartapp.service;

import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;

public interface AiService {
    RecipeResponse generateRecipe(RecipeRequest request);
}
