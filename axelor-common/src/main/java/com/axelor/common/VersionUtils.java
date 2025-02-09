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
package com.axelor.common;

import java.security.CodeSource;
import java.util.jar.JarInputStream;
import java.util.jar.Manifest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Provides helper methods to find version information of axelor projects. */
public final class VersionUtils {

  private static Version version;
  private static String buildDate;
  private static String gitHash;

  private static final Pattern VERSION_PATTERN =
      Pattern.compile("^(\\d+)\\.(\\d+)\\.(\\d+)(?:\\-rc(\\d+))?(-SNAPSHOT)?$");

  /** This class stores version details of axelor modules. */
  public static class Version {

    public static Version UNKNOWN = new Version("0.0.0");

    public final String version;

    // feature version (major.minor)
    public final String feature;

    public final int major;

    public final int minor;

    public final int patch;

    public final int rc;

    public final boolean snapshot;

    Version(String version) {
      final Matcher matcher = VERSION_PATTERN.matcher(version.trim());
      if (!matcher.matches()) {
        throw new IllegalStateException("Invalid version string.");
      }
      this.version = version.trim();
      this.major = Integer.parseInt(matcher.group(1));
      this.minor = Integer.parseInt(matcher.group(2));
      this.patch = Integer.parseInt(matcher.group(3));
      this.rc = matcher.group(4) != null ? Integer.parseInt(matcher.group(4)) : 0;
      this.feature = String.format("%s.%s", major, minor);
      this.snapshot = matcher.group(5) != null;
    }

    @Override
    public String toString() {
      return version;
    }
  }

  /**
   * Get the Axelor SDK version.
   *
   * @return an instance of {@link Version}
   */
  public static Version getVersion() {
    return version;
  }

  /**
   * Get the Axelor SDK build date.
   *
   * @return build date
   */
  public static String getBuildDate() {
    return buildDate;
  }

  /**
   * Get the Axelor SDK build git hash.
   *
   * @return build git hash
   */
  public static String getGitHash() {
    return gitHash;
  }

  static {
    version = Version.UNKNOWN;
    try {
      CodeSource codeSource = VersionUtils.class.getProtectionDomain().getCodeSource();
      String urlStr = codeSource.getLocation() == null ? "" : codeSource.getLocation().toString();
      if (urlStr.startsWith("file:/") && urlStr.endsWith(".jar")) {
        try (JarInputStream jar = new JarInputStream(codeSource.getLocation().openStream())) {
          Manifest manifest = jar.getManifest();
          buildDate = manifest.getMainAttributes().getValue("Build-Date");
          gitHash = manifest.getMainAttributes().getValue("Implementation-Build");
          version = new Version(manifest.getMainAttributes().getValue("Implementation-Version"));
        }
      }
    } catch (Exception e) {
      // ignore
    }
  }
}
