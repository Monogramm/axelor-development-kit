/*
 * Axelor Business Solutions
 *
 * Copyright (C) 2005-2025 Axelor (<http://axelor.com>).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.axelor.db.tenants;

import com.axelor.common.StringUtils;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;

/** The tenant identifier resolver. */
public class TenantResolver implements CurrentTenantIdentifierResolver {

  static final ThreadLocal<String> CURRENT_HOST = new ThreadLocal<>();
  static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

  private static boolean enabled;

  public TenantResolver() {
    enabled = TenantModule.isEnabled();
  }

  public static void setCurrentTenant(String tenantId, String tenantHost) {
    if (!enabled) return;
    CURRENT_TENANT.set(tenantId);
    CURRENT_HOST.set(tenantHost);
  }

  public static String currentTenantIdentifier() {
    if (!enabled) return null;
    final String tenant = CURRENT_TENANT.get();
    return tenant == null ? TenantConfig.DEFAULT_TENANT_ID : tenant;
  }

  public static String currentTenantHost() {
    if (!enabled) return null;
    final String tenant = CURRENT_HOST.get();
    return tenant == null ? null : tenant;
  }

  public static Map<String, String> getTenants() {
    return getTenants(true);
  }

  public static Map<String, String> getTenants(boolean onlyVisible) {
    return configsToNames(getTenantConfigs(onlyVisible));
  }

  public static TenantInfo getTenantInfo() {
    return getTenantInfo(true);
  }

  public static TenantInfo getTenantInfo(boolean onlyVisible) {
    final Map<String, TenantConfig> configs = getTenantConfigs(onlyVisible);

    // Check if a single tenant was host-resolved.
    if (configs.size() == 1) {
      final TenantConfig config = configs.values().iterator().next();
      if (StringUtils.notBlank(config.getTenantHosts())) {
        return TenantInfo.single(config.getTenantId());
      }
    }

    // User-selectabled tenants
    return TenantInfo.multiple(configsToNames(configs));
  }

  private static Map<String, TenantConfig> getTenantConfigs(boolean onlyVisible) {
    final Map<String, TenantConfig> map = new LinkedHashMap<>();
    if (enabled) {
      final TenantConfigProvider provider = TenantSupport.get().getConfigProvider();
      for (TenantConfig config : provider.findAll(TenantResolver.CURRENT_HOST.get())) {
        if (!Boolean.FALSE.equals(config.getActive())
            && (!onlyVisible || !Boolean.FALSE.equals(config.getVisible()))) {
          map.put(config.getTenantId(), config);
        }
      }
    }
    return map;
  }

  private static Map<String, String> configsToNames(Map<String, TenantConfig> configs) {
    return configs.values().stream()
        .collect(
            Collectors.toMap(
                TenantConfig::getTenantId,
                config ->
                    Optional.ofNullable(config.getTenantName()).orElseGet(config::getTenantId),
                (existing, replacement) -> existing,
                LinkedHashMap::new));
  }

  @Override
  public String resolveCurrentTenantIdentifier() {
    return currentTenantIdentifier();
  }

  @Override
  public boolean validateExistingCurrentSessions() {
    return true;
  }
}
