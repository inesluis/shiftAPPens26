package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.ProductPrice;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class ProductPriceRepository {

    public List<ProductPrice> findByIngredientIds(List<Long> ingredientIds) {
        if (ingredientIds == null || ingredientIds.isEmpty()) return List.of();
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT pp FROM ProductPrice pp WHERE pp.ingredientId IN :ids", ProductPrice.class)
                    .setParameter("ids", ingredientIds)
                    .getResultList();
        } finally {
            em.close();
        }
    }

    private EntityManager createEntityManager() {
        EntityManagerFactory emf = JpaUtil.getEntityManagerFactory();
        return emf.createEntityManager();
    }
}
