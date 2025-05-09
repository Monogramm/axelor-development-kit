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
package com.axelor.meta.schema.views;

import com.fasterxml.jackson.annotation.JsonTypeName;
import java.util.List;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElements;
import javax.xml.bind.annotation.XmlType;

@XmlType
@JsonTypeName("panel")
public class Panel extends AbstractPanel {

  @XmlAttribute private Boolean canCollapse;

  @XmlAttribute private String collapseIf;

  @XmlAttribute private String icon;

  @XmlAttribute(name = "icon-background")
  private String iconBackground;

  @XmlElement private Menu menu;

  @XmlElements({
    @XmlElement(name = "field", type = PanelField.class),
    @XmlElement(name = "spacer", type = Spacer.class),
    @XmlElement(name = "label", type = Label.class),
    @XmlElement(name = "static", type = Static.class),
    @XmlElement(name = "separator", type = Separator.class),
    @XmlElement(name = "help", type = Help.class),
    @XmlElement(name = "button", type = Button.class),
    @XmlElement(name = "button-group", type = ButtonGroup.class),
    @XmlElement(name = "panel", type = Panel.class),
    @XmlElement(name = "panel-related", type = PanelRelated.class),
    @XmlElement(name = "panel-dashlet", type = Dashlet.class),
    @XmlElement(name = "panel-include", type = PanelInclude.class)
  })
  private List<AbstractWidget> items;

  public Boolean getCanCollapse() {
    return canCollapse;
  }

  public void setCanCollapse(Boolean canCollapse) {
    this.canCollapse = canCollapse;
  }

  public String getCollapseIf() {
    return collapseIf;
  }

  public void setCollapseIf(String collapseIf) {
    this.collapseIf = collapseIf;
  }

  public String getIcon() {
    return icon;
  }

  public void setIcon(String icon) {
    this.icon = icon;
  }

  public String getIconBackground() {
    return iconBackground;
  }

  public void setIconBackground(String iconBackground) {
    this.iconBackground = iconBackground;
  }

  public Menu getMenu() {
    return menu;
  }

  public void setMenu(Menu menu) {
    this.menu = menu;
  }

  public List<AbstractWidget> getItems() {
    return process(items);
  }

  public void setItems(List<AbstractWidget> items) {
    this.items = items;
  }
}
