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
package com.axelor.db.annotations;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** This annotation can be used to specify details about field for change tracking. */
@Documented
@Target({})
@Retention(RetentionPolicy.RUNTIME)
public @interface TrackField {

  /**
   * The field name to track.
   *
   * @return the field name
   */
  String name();

  /**
   * The condition to check.
   *
   * @return the condition
   */
  String condition() default "";

  /**
   * Specify the event on which to track.
   *
   * @return the event
   */
  TrackEvent on() default TrackEvent.DEFAULT;
}
