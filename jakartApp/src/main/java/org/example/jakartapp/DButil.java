package org.example.jakartapp;


import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

public class DButil {
    private static Properties props = new Properties();
    static {
        try (InputStream input = DButil.class.getClassLoader().getResourceAsStream("db.properties")) {
            if (input == null) {
                throw new RuntimeException("db.properties not found in classpath");
            }

            props.load(input);
        }catch (Exception e){
            throw  new RuntimeException("Failed to load db.properties",e);
        }

    }
    public static Connection getConnection() throws SQLException{
        try {
            Class.forName("org.postgresql.Driver");
        }catch (ClassNotFoundException e){
            throw new SQLException("PostgreSQL Driver not found", e);
        }

        String url = props.getProperty("db.url");
        String user = props.getProperty("db.user");
        String password = props.getProperty("db.password");

        if (url == null || user == null || password == null){
            throw new SQLException(
                    "Missing DB environmental variables: url, user and password"
            );
        }

        return DriverManager.getConnection(url, user, password);
    }
}
