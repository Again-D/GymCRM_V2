package com.gymcrm.auth;

import jakarta.persistence.*;
import java.util.Set;

@Entity
@Table(name = "roles")
public class RoleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long roleId;

    @Column(name = "role_code", nullable = false, unique = true)
    private String roleCode;

    @Column(name = "description")
    private String description;

    @ManyToMany(mappedBy = "roles")
    private Set<AuthUserEntity> users;

    protected RoleEntity() {
    }

    public RoleEntity(String roleCode) {
        this.roleCode = roleCode;
    }

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
    public String getRoleCode() { return roleCode; }
    public void setRoleCode(String roleCode) { this.roleCode = roleCode; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Set<AuthUserEntity> getUsers() { return users; }
}
