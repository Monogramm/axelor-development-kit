import { atom, useAtomValue } from "jotai";
import { createScope, molecule, useMolecule } from "bunshi/react";
import { selectAtom, useAtomCallback } from "jotai/utils";
import { isEqual } from "lodash";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { dialogs } from "@/components/dialogs";
import {
  Tab,
  TabAtom,
  TabProps,
  TabRoute,
  TabState,
  useTabs,
} from "@/hooks/use-tabs";
import { SearchOptions } from "@/services/client/data";
import { equalsIgnoreClean } from "@/services/client/data-utils";
import { ViewData } from "@/services/client/meta";
import {
  JsonField,
  Property,
  Schema,
  ViewType,
} from "@/services/client/meta.types";
import { focusAtom } from "@/utils/atoms";
import { FormAtom, usePrepareContext } from "@/views/form/builder";
import {
  useCanDirty,
  useFormActiveHandler,
  useFormScope,
} from "@/views/form/builder/scope";
import { processContextValues } from "@/views/form/builder/utils";

const fallbackAtom: TabAtom = atom(
  () => ({
    title: "",
    type: "",
  }),
  () => {},
);

const fallbackTab: Tab = {
  id: "",
  title: "",
  action: {
    name: "",
    title: "",
    viewType: "",
  },
  state: fallbackAtom,
};

export const ViewScope = createScope<Tab>(fallbackTab);

const viewMolecule = molecule((getMol, getScope) => {
  const initialView = getScope(ViewScope);
  return atom(initialView);
});

export const MetaScope = createScope<ViewData<ViewType>>({
  view: { type: "form" },
  fields: {},
});

const metaMolecule = molecule((getMol, getScope) => {
  const meta = getScope(MetaScope);
  return atom(meta);
});

/**
 * This scoped hook can be used to access current Tab.
 *
 * @returns current Tab
 */
export function useViewTab() {
  const viewAtom = useMolecule(viewMolecule);
  return useAtomValue(viewAtom);
}

/**
 * This scoped hook can be used to access current action view.
 *
 * @returns current ActionView
 */
export function useViewAction() {
  const tab = useViewTab();
  return tab.action;
}

/**
 * This scoped hook can be used to access view context.
 *
 * @returns Context
 */
export function useViewContext() {
  const { action, dashlet } = useViewTab();
  const { formAtom } = useFormScope();
  const setState = useFormActiveHandler();

  const getFormContext = usePrepareContext(formAtom);

  const _recordId = useAtomValue(
    useMemo(() => selectAtom(formAtom, (form) => form.record.id), [formAtom]),
  );
  const [recordId, setRecordId] = useState(_recordId);

  useEffect(() => {
    // In case of form view dashlet, changing recordId will cause
    // new callback generation as below, this will eventually result into
    // search data of respective view, so now it will delay recordId change
    // unless component get activated
    setState(() => setRecordId(_recordId));
  }, [_recordId, setState]);

  return useCallback(
    (actionContext?: boolean) => {
      const _parent = dashlet || recordId ? getFormContext() : undefined;
      return processContextValues(
        actionContext
          ? {
              ...action.context,
              _parent,
            }
          : {
              ..._parent,
              ...action.context,
            },
      );
    },
    [dashlet, recordId, action.context, getFormContext],
  );
}

/**
 * This hook can be used to access current tab state.
 * @param selector the selector function
 * @returns selected state value
 */
export function useSelectViewState<T>(selector: (state: TabState) => T) {
  const tab = useViewTab();
  return useAtomValue(
    useMemo(
      () => selectAtom(tab.state, selector, isEqual),
      [tab.state, selector],
    ),
  );
}

interface SwitchTo {
  /**
   * Switch to the given view type.
   *
   * @param type view type
   * @param options additional options for the given view type
   */
  (
    type: string,
    options?: {
      /**
       * The route options for the given view type
       */
      route?: { mode?: string; id?: string; qs?: Record<string, string> };

      /**
       * The additional state for the given view type
       */
      props?: Record<string, any>;
    },
  ): void;
}

/**
 * This scoped hook can be used to switch between different
 * views or update route of the current tab.
 *
 * @returns a function to switch views or update route
 */
export function useViewSwitch() {
  const tab = useViewTab();
  const action = tab.id;
  const { open } = useTabs();

  const switchTo: SwitchTo = useAtomCallback(
    useCallback(
      (get, set, type, options) => {
        if (action) {
          const state = get(tab.state);
          const hasView = tab.action?.views?.some((v) => v.type === type);
          if (!hasView) return;
          if (state.dirty && state.type !== type) {
            set(tab.state, { ...state, dirty: false });
          }
          open(action, { type, ...options });
        }
      },
      [action, open, tab.state, tab.action],
    ),
  );

  return switchTo;
}

/**
 * This hook can be used to keep track of view specific state in tab.
 *
 */
export function useViewProps() {
  const tab = useViewTab();
  const { type, props } = useSelectViewState(
    useCallback(({ type, props }) => ({ type, props }), []),
  );

  const state = props?.[type];
  const setState = useAtomCallback(
    useCallback(
      (get, set, setter: SetStateAction<TabProps>) => {
        const state = get(tab.state);
        const { type, props } = state;
        const viewState = state.props?.[type];

        const newViewState = {
          ...viewState,
          ...(typeof setter === "function" ? setter(viewState || {}) : setter),
        };

        const newProps = {
          ...props,
          [type]: newViewState,
        };

        set(tab.state, { ...state, props: newProps });
      },
      [tab.state],
    ),
  );

  return [state, setState] as const;
}

export function useViewDirtyAtom() {
  const tab = useViewTab();
  return useMemo(
    () =>
      focusAtom(
        tab.state,
        (o) => o.dirty ?? false,
        (o, v) => ({ ...o, dirty: v }),
      ),
    [tab.state],
  );
}

/**
 * Hook that provides a function to update the view dirty state
 * by comparing the record with the original.
 *
 * Intended use is for resetting dirty state after discarding/reverting changes.
 *
 * @param {FormAtom} formAtom
 * @returns A callback function to update view dirty state.
 */
export function useUpdateViewDirty(formAtom: FormAtom) {
  const viewDirtyAtom = useViewDirtyAtom();
  const canDirty = useCanDirty();

  const updateDirty = useAtomCallback(
    useCallback(
      (get, set) => {
        const { record, original } = get(formAtom);
        const dirty = !equalsIgnoreClean(record, original ?? {}, canDirty);
        set(viewDirtyAtom, dirty);
      },
      [canDirty, formAtom, viewDirtyAtom],
    ),
  );

  return updateDirty;
}

/**
 * This hook should be used by views to get the current route options.
 *
 * @param type the view type for which to get the route options
 * @returns TabRoute option of the given view type
 */
export function useViewRoute() {
  const { type, routes } = useSelectViewState(
    useCallback(({ type, routes }) => ({ type, routes }), []),
  );
  const options = routes?.[type] ?? {};
  return options as TabRoute;
}

export function useViewTabRefresh(
  viewType: string,
  refresh: (
    options?: Partial<SearchOptions> & {
      forceReload?: boolean;
    },
  ) => void,
) {
  const tab = useViewTab();
  const type = useSelectViewState(useCallback(({ type }) => type, []));
  const handleRefresh = useCallback(
    (e: Event) => {
      if (
        e instanceof CustomEvent &&
        e.detail?.id === tab.id &&
        type === viewType
      ) {
        refresh({ forceReload: e.detail?.forceReload });
      }
    },
    [refresh, tab.id, type, viewType],
  );

  useEffect(() => {
    document.addEventListener("tab:refresh", handleRefresh);
    return () => {
      document.removeEventListener("tab:refresh", handleRefresh);
    };
  }, [handleRefresh]);
}

export function useViewConfirmDirty() {
  const tab = useViewTab();
  const canConfirm = tab.action.params?.["show-confirm"] !== false;
  return useCallback(
    (
      check: () => Promise<boolean>,
      callback: () => Promise<any>,
      options?: {
        title?: string;
        content?: React.ReactNode;
      },
    ) =>
      dialogs.confirmDirty(
        async () => canConfirm && (await check()),
        callback,
        options,
      ),
    [canConfirm],
  );
}

/**
 * This hook can be used to access the current view's meta data
 *
 */
export function useViewMeta() {
  const metaAtom = useMolecule(metaMolecule);
  const meta = useAtomValue(metaAtom);

  const findField = useCallback((name: string) => meta.fields?.[name], [meta]);

  const findItem = useCallback(
    (fieldName: string) => findViewItem(meta, fieldName),
    [meta],
  );

  const findItems = useMemo(() => {
    return (() => {
      let items: Schema[] | null = null;
      return (): Schema[] => {
        if (items === null) {
          items = findSchemaItems(meta.view).map((item) =>
            item.name ? findItem(item.name) ?? { ...item } : { ...item },
          );
        }
        return items;
      };
    })();
  }, [findItem, meta.view]);

  return {
    meta,
    findField,
    findItem,
    findItems,
  } as const;
}

export function findViewItem<T extends ViewType>(
  meta: ViewData<T>,
  fieldName: string,
) {
  const { view, fields = {} } = meta;
  return walkSchema(view, fields, [], ({ path, schema, field }) => {
    const name = path.join(".");
    if (name === fieldName) {
      const serverType = schema?.serverType || field?.type;
      const more = serverType ? { serverType } : {};
      return {
        ...field,
        ...schema,
        ...schema?.widgetAttrs,
        ...more,
      };
    }
  });
}

export function findJsonFieldItem<T extends ViewType>(
  meta: ViewData<T>,
  fieldName: string,
) {
  const { jsonFields } = meta;
  const [jsonField, ...jsonParts] = fieldName.split(".");

  if (jsonParts.length > 0) {
    const jsonPath = jsonParts.join(".");
    const fieldInfo =
      jsonFields?.[jsonField]?.[jsonPath] ??
      jsonFields?.[jsonField]?.[jsonParts[0]];

    if (fieldInfo) return fieldInfo;
  }

  for (const [modelField, _fields] of Object.entries(jsonFields ?? {})) {
    if (jsonField !== modelField && _fields[jsonField]) {
      return _fields[jsonField];
    }
    if (_fields[fieldName]) {
      return _fields[fieldName];
    }
  }
}

function findSchemaItems(schema: Schema): Schema[] {
  const items = schema.type !== "panel-related" ? schema.items ?? [] : [];
  const nested = items.flatMap((item) => findSchemaItems(item));
  return [...items, ...nested];
}

function findFields(schema: Schema) {
  const fields: Record<string, Property> =
    schema.fields ?? schema.editor?.fields ?? {};
  return fields;
}

function walkSchema(
  schema: Schema,
  schemaFields: Record<string, Property>,
  schemaPath: string[],
  callback: (params: {
    path: string[];
    name: string;
    schema: Schema;
    field?: Schema;
  }) => Schema | undefined,
): Schema | undefined {
  const name = schema.name;
  const items = schema.items ?? schema.editor?.items ?? [];
  const path = name ? [...schemaPath, ...name.split(".")] : schemaPath;

  if (name) {
    const res = callback({
      path,
      name,
      schema,
      field: schemaFields[name],
    });
    if (res) return res;
  }

  const isRelation = schema.fields ?? schema.editor?.fields;
  const parentPath = isRelation ? path : schemaPath;
  const parentFields = isRelation ? findFields(schema) : schemaFields;

  for (const item of items) {
    const res = walkSchema(item, parentFields, parentPath, callback);
    if (res) return res;
  }
}
