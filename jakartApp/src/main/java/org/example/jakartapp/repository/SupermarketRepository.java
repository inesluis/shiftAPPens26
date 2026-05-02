package org.example.jakartapp.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.example.jakartapp.entity.Supermarket;
import org.example.jakartapp.util.JpaUtil;

import java.util.List;

@ApplicationScoped
public class SupermarketRepository {

    public List<Supermarket> findAll() {
        EntityManager em = createEntityManager();
        try {
            return em.createQuery("SELECT s FROM Supermarket s ORDER BY s.supermarketName", Supermarket.class).getResultList();
        } finally {
            em.close();
        }
    }

    private EntityManager createEntityManager() {
        EntityManagerFactory emf = JpaUtil.getEntityManagerFactory();
        return emf.createEntityManager();
    }
}
