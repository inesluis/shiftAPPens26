package org.example.jakartapp.service;

import dev.langchain4j.model.openai.OpenAiChatModel;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;

import java.util.List;

@ApplicationScoped
//@Alternative
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
        String prompt = String.format(
                "Act as a professional chef. Generate a detailed cooking recipe for '%s' which is a '%s' dish.\n" +
                "Ingredients to use: %s.\n" +
                "Provide the instructions as a simple list of steps, one step per line. Do not include numbers or bullet points.",
                request.name(), request.type(), String.join(", ", request.ingredients())
        );

        String response = model.chat(prompt);
        
        List<String> instructions = java.util.Arrays.stream(response.split("\n"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        return new RecipeResponse(request.name(), request.type(), instructions);
    }

    @Override
    public String simplequery(String prompt) {
        return model.chat(prompt);
    }
}
