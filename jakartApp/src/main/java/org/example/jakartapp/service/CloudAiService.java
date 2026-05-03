package org.example.jakartapp.service;

import dev.langchain4j.model.openai.OpenAiChatModel;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.enterprise.context.ApplicationScoped;
import org.example.jakartapp.dto.RecipeRequest;
import org.example.jakartapp.dto.RecipeResponse;

import java.util.List;
import java.util.Arrays;
import java.util.stream.Collectors;

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
        String difficulty = request.difficulty() != null ? request.difficulty() : "medium";
        String difficultyLabel = switch (difficulty) {
            case "easy" -> "simples e rápida (poucos passos, sem técnicas especiais)";
            case "hard" -> "avançada (técnicas complexas, várias etapas)";
            default -> "intermédia (alguns passos, habilidade moderada)";
        };

        String ingredientList = String.join(", ", request.ingredients());

        String prompt = String.format(
            "És um chef profissional. Escreve as instruções de culinária passo a passo para uma receita chamada \"%s\".\n" +
            "Tipo de refeição: %s\n" +
            "Ingredientes disponíveis: %s\n" +
            "Nível de dificuldade: %s\n\n" +
            "Devolve APENAS os passos numerados (ex: 1. Faz isto. 2. Faz aquilo.), sem introdução, sem título, sem comentários extra. " +
            "Escreve em Português de Portugal.",
            request.name(),
            request.type() != null ? request.type() : "qualquer",
            ingredientList,
            difficultyLabel
        );

        String aiText = model.chat(prompt);

        List<String> instructions = Arrays.stream(aiText.split("\\n+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());

        return new RecipeResponse(request.name(), request.type(), instructions);
    }

    @Override
    public String simplequery(String prompt) {
        return model.chat(prompt);
    }
}
