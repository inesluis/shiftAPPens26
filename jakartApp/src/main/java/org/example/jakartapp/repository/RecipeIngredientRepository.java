package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.RecipeIngredient;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class RecipeIngredientRepository {

    public List<RecipeIngredient> findByRecipeId(Long recipeId) {
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT ri FROM RecipeIngredient ri WHERE ri.recipeId = :rid ORDER BY ri.recipeIngredientId", RecipeIngredient.class)
                    .setParameter("rid", recipeId)
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
