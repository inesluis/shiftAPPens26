package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.UserRecipeProduct;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class UserRecipeProductRepository {

    public List<UserRecipeProduct> findByUserRecipeId(Long userRecipeId) {
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT urp FROM UserRecipeProduct urp WHERE urp.userRecipeId = :rid", UserRecipeProduct.class)
                    .setParameter("rid", userRecipeId)
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
