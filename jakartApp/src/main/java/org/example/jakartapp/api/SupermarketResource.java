package org.example.jakartapp.api;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.example.jakartapp.entity.Supermarket;
import org.example.jakartapp.repository.SupermarketRepository;

import java.util.List;

@Path("/supermarkets")
@Produces(MediaType.APPLICATION_JSON)
public class SupermarketResource {

    @Inject
    private SupermarketRepository supermarketRepository;

    @GET
    public Response list() {
        List<Supermarket> list = supermarketRepository.findAll();
        return Response.ok(list).build();
    }
}
