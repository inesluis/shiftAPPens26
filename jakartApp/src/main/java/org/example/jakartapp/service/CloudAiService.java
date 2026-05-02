package org.example.jakartapp.service;

import dev.langchain4j.model.openai.OpenAiChatModel;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;

import java.util.List;

@ApplicationScoped
public class CloudAiService implements AiService {
    private static final Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
    
    private final OpenAiChatModel model = OpenAiChatModel.builder()
            .apiKey(getApiKey())
            .modelName("gpt-4o-mini")
            .build();

    private String getApiKey() {
        String key = dotenv.get("OPENAI_API_KEY");
        if (key == null || key.isEmpty()) {
            key = System.getenv("OPENAI_API_KEY");
        }
        return key;
    }

    @Override
    public RecipeResponse generateRecipe(RecipeRequest request) {
        // This is a placeholder implementation as seen in the original code
        return new RecipeResponse(
                request.name(),
                request.type(),
                List.of(
                        "Prepare Ingredients: " + String.join(", ", request.ingredients()),
                        "Cook everything step by step"
                )
        );
    }

    @Override
    public String simplequery(String prompt) {
        return model.chat(prompt);
    }
}
