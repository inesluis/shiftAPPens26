package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.entity.Ingredient;
import org.example.jakartapp.entity.ProductPrice;
import org.example.jakartapp.repository.IngredientRepository;
import org.example.jakartapp.repository.ProductPriceRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/ingredients")
@Produces(MediaType.APPLICATION_JSON)
public class IngredientResource {

    @Inject
    private IngredientRepository ingredientRepository;

    @Inject
    private ProductPriceRepository productPriceRepository;

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

    @GET
    @Path("/compare")
    public Response compareIngredients(@QueryParam("term") String term) {
        List<Ingredient> ingredients = ingredientRepository.search(term);
        if (ingredients.isEmpty()) return Response.ok(List.of()).build();

        List<Long> ids = ingredients.stream().map(Ingredient::getIngredientId).toList();
        Map<Long, String> ingredientNameMap = new HashMap<>();
        for (Ingredient i : ingredients) {
            ingredientNameMap.put(i.getIngredientId(), i.getIngredientName());
        }

        List<ProductPrice> prices = productPriceRepository.findByIngredientIds(ids);
        
        // Grouping logic
        Map<String, Map<String, org.example.jakartapp.dto.ProductSearchResponse>> grouped = new HashMap<>();

        for (ProductPrice pp : prices) {
            if (pp.getProduct() == null || pp.getSupermarket() == null) continue;

            String ingName = ingredientNameMap.get(pp.getIngredientId());
            if (ingName == null) ingName = pp.getProduct().getProductName();

            String productId = pp.getProductId();
            String store = resolveStore(pp.getSupermarket().getSupermarketName());
            if (store == null) continue;

            Double pricePerKg = toPricePerKg(pp.getPrice(), pp.getPricePerUnit(), pp.getProduct().getWeight());
            if (pricePerKg == null) continue;

            Map<String, org.example.jakartapp.dto.ProductSearchResponse> byIngredient = grouped.computeIfAbsent(ingName, k -> new HashMap<>());
            org.example.jakartapp.dto.ProductSearchResponse existing = byIngredient.get(productId);

            if (existing != null) {
                existing.prices().put(store, pricePerKg);
            } else {
                Map<String, Double> storePrices = new HashMap<>();
                storePrices.put(store, pricePerKg);
                
                org.example.jakartapp.dto.ProductSearchResponse.Macros macros = new org.example.jakartapp.dto.ProductSearchResponse.Macros(
                    toPer100g(pp.getProduct().getEnergyKcal(), pp.getProduct().getWeight()),
                    toPer100g(pp.getProduct().getProtein(), pp.getProduct().getWeight()),
                    toPer100g(pp.getProduct().getCarbohydrates(), pp.getProduct().getWeight()),
                    toPer100g(pp.getProduct().getFats(), pp.getProduct().getWeight())
                );

                byIngredient.put(productId, new org.example.jakartapp.dto.ProductSearchResponse(
                    productId,
                    ingName,
                    pp.getProduct().getProductName(),
                    pp.getProduct().getProductBrand() != null ? pp.getProduct().getProductBrand() : pp.getProduct().getProductName(),
                    storePrices,
                    macros
                ));
            }
        }

        // Convert to list of lists (groups)
        List<List<org.example.jakartapp.dto.ProductSearchResponse>> result = grouped.values().stream()
            .map(m -> m.values().stream().toList())
            .toList();

        return Response.ok(result).build();
    }

    private String resolveStore(String name) {
        if (name == null) return null;
        String val = name.toLowerCase();
        if (val.contains("continente")) return "continente";
        if (val.contains("pingo")) return "pingo_doce";
        return null;
    }

    private Double toPricePerKg(Double price, Double pricePerUnit, Double weight) {
        if (pricePerUnit != null && pricePerUnit > 0) return pricePerUnit;
        if (price != null && weight != null && weight > 0) return (price / weight) * 1000;
        return null;
    }

    private Double toPer100g(Double value, Double weight) {
        if (value == null) return 0.0;
        if (weight != null && weight > 0) return (value / weight) * 100;
        return value;
    }
}