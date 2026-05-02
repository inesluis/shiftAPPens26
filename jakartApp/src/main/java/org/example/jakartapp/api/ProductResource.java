package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.entity.Product;
import org.example.jakartapp.repository.ProductRepository;

import java.util.List;

@Path("/products")
@Produces(MediaType.APPLICATION_JSON)
public class ProductResource {

    @Inject
    private ProductRepository productRepository;

    @GET
    public Response list() {
        List<Product> list = productRepository.findAll();
        return Response.ok(list).build();
    }

    @GET
    @Path("/search")
    public Response search(@QueryParam("term") String term) {
        List<Product> list = productRepository.searchByName(term);
        return Response.ok(list).build();
    }
}
