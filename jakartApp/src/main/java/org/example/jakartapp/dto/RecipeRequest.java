package org.example.jakartapp.dto;

import java.util.List;

public record RecipeRequest(String name, String type, List<String> ingredients) {
}
