import { Box, CommandBar, CommandItemProps, clsx } from "@axelor/ui";
import { useAtomValue } from "jotai";
import { useAtomCallback } from "jotai/utils";
import { useCallback, useEffect, useState } from "react";

import { PageText } from "@/components/page-text";
import { useDataStore } from "@/hooks/use-data-store";
import { SearchOptions } from "@/services/client/data";
import { DataStore } from "@/services/client/data-store";
import { i18n } from "@/services/client/i18n";
import { CardsView, ChartView, GridView } from "@/services/client/meta.types";
import { DEFAULT_PAGE_SIZE } from "@/utils/app-settings.ts";
import { download } from "@/utils/download";
import { getExportFieldNames } from "@/view-containers/advance-search/utils";
import {
  DashletHandler,
  useDashletHandlerAtom,
} from "@/view-containers/view-dashlet/handler";
import { ToolbarActions } from "@/view-containers/view-toolbar";
import { useViewTabRefresh } from "@/view-containers/views/scope";
import { useFormActiveHandler, useFormRefresh } from "../../builder/scope";

import classes from "./dashlet-actions.module.scss";

interface DashletMenuProps extends DashletHandler {
  viewType?: string;
  items?: CommandItemProps[];
}

const noop = () => {};

export function DashletActions({
  viewType,
  dashboard,
  showBars,
}: Pick<DashletMenuProps, "viewType"> & {
  dashboard?: boolean;
  showBars?: boolean;
}) {
  const {
    view,
    actionExecutor,
    getContext,
    dataStore,
    gridStateAtom,
    onAdd,
    onDelete,
    onAction,
    onLegendShowHide,
    onRefresh,
    onExport,
  } = useAtomValue(useDashletHandlerAtom());
  const hasPagination = ["grid", "cards", "tree"].includes(viewType!);
  const { toolbar, menubar } = (view as GridView | CardsView) || {};

  const setRefresh = useFormActiveHandler();
  const doRefresh = useCallback(() => {
    setRefresh(onRefresh ?? (() => {}));
  }, [setRefresh, onRefresh]);

  // register form:refresh
  useFormRefresh(doRefresh);

  // register tab:refresh
  useViewTabRefresh(
    dashboard ? "dashboard" : "form",
    dashboard && onRefresh ? onRefresh : noop,
  );

  return (
    <Box
      className={classes.actions}
      gap={1}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {showBars && (toolbar || menubar) && (
        <ToolbarActions
          buttons={toolbar}
          menus={menubar}
          actionContext={getContext?.()}
          actionExecutor={actionExecutor}
        />
      )}

      {dataStore && hasPagination ? (
        <DashletListMenu
          view={view}
          viewType={viewType}
          dataStore={dataStore}
          gridStateAtom={gridStateAtom}
          onAdd={onAdd}
          onDelete={onDelete}
          onAction={onAction}
          onRefresh={onRefresh}
        />
      ) : (
        <DashletMenu
          view={view}
          viewType={viewType}
          onAdd={onAdd}
          onDelete={onDelete}
          onAction={onAction}
          onLegendShowHide={onLegendShowHide}
          onRefresh={onRefresh}
          onExport={onExport}
        />
      )}
    </Box>
  );
}

function DashletMenu({
  items = [],
  view,
  viewType,
  onLegendShowHide,
  onAction,
  onRefresh,
  onExport,
}: DashletMenuProps) {
  const [legend, showLegend] = useState(true);

  function getViewActions() {
    const actions =
      (viewType === "chart" && (view as ChartView)?.actions) || [];
    if (actions.length > 0) {
      return [
        { key: "chart-actions-divider", divider: true },
        ...actions.map(({ name, title, action }) => ({
          key: name!,
          text: title,
          onClick: () => {
            action && onAction?.(action, { _signal: name });
          },
        })),
      ];
    }
    return [];
  }

  useEffect(() => {
    if (
      viewType === "chart" &&
      String((view as ChartView)?.config?.hideLegend) === "true"
    ) {
      showLegend(false);
    }
  }, [viewType, view]);

  return (
    <CommandBar
      items={[
        ...items,
        {
          key: "settings",
          iconOnly: true,
          iconProps: {
            icon: "settings",
          },
          items: [
            {
              key: "refresh",
              text: i18n.get("Refresh"),
              onClick: () => onRefresh?.(),
            },
            {
              key: "show-hide-legend",
              hidden: viewType !== "chart",
              text: legend ? i18n.get("Hide legend") : i18n.get("Show legend"),
              onClick: () => {
                showLegend(!legend);
                onLegendShowHide?.(!legend);
              },
            },
            {
              key: "export",
              text: i18n.get("Export"),
              hidden: !onExport,
              onClick: onExport,
            },
            ...getViewActions(),
          ],
        },
      ]}
    />
  );
}

// grid/card dashlet pagination
function DashletListMenu(
  props: DashletMenuProps & {
    dataStore: DataStore;
    gridStateAtom?: DashletHandler["gridStateAtom"];
  },
) {
  const { dataStore, gridStateAtom, viewType, onAdd, onDelete, ...menuProps } =
    props;
  const page = useDataStore(dataStore, (store) => store.page);
  const { offset = 0, limit = DEFAULT_PAGE_SIZE, totalCount = 0 } = page;
  const canPrev = offset > 0;
  const canNext = offset + limit < totalCount;

  const onExport = useAtomCallback(
    useCallback(
      async (get) => {
        const options: SearchOptions = {};
        if (gridStateAtom) {
          const { columns } = get(gridStateAtom);
          options.fields = getExportFieldNames(columns);
        }
        const { fileName } = await dataStore.export(options);
        download(
          `ws/rest/${dataStore.model}/export/${fileName}?fileName=${fileName}`,
          fileName,
        );
      },
      [dataStore, gridStateAtom],
    ),
  );

  return (
    <>
      <PageText dataStore={dataStore} />
      <DashletMenu
        {...menuProps}
        {...(viewType === "grid" && { onExport })}
        items={[
          {
            key: "prev",
            iconProps: {
              icon: "chevron_backward",
            },
            className: clsx(classes.itemAction, {
              [classes.itemActionEnabled]: canPrev,
            }),
            disabled: !canPrev,
            onClick: () => dataStore.search({ offset: offset - limit }),
          },
          {
            key: "next",
            iconSide: "end",
            iconProps: {
              icon: "chevron_forward",
            },
            className: clsx(classes.itemAction, {
              [classes.itemActionEnabled]: canNext,
            }),
            disabled: !canNext,
            onClick: () => dataStore.search({ offset: offset + limit }),
          },
          {
            key: "new",
            text: i18n.get("New"),
            hidden: !onAdd,
            iconProps: {
              icon: "add",
            },
            iconOnly: true,
            onClick: onAdd,
          },
          {
            key: "delete",
            text: i18n.get("Delete"),
            hidden: !onDelete,
            iconProps: {
              icon: "delete",
            },
            iconOnly: true,
            onClick: onDelete,
          },
        ]}
      />
    </>
  );
}
