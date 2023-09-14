import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";

import { Box, Button as Btn, Image } from "@axelor/ui";

import { dialogs } from "@/components/dialogs";
import { Tooltip } from "@/components/tooltip";
import { Schema } from "@/services/client/meta.types";

import { WidgetControl, WidgetProps } from "../../builder";
import { useFormScope } from "../../builder/scope";
import { useReadonly } from "./hooks";

import { Icon } from "@/components/icon";
import styles from "./button.module.scss";

function ButtonIcon({ schema }: WidgetProps) {
  const { icon, iconHover } = schema;
  const isImage = icon?.includes(".");

  if (!icon) return null;
  if (isImage) {
    return <Image src={icon} alt={icon} />;
  }

  return (
    <div className={styles.icons}>
      <Icon
        icon={icon}
        className={clsx(styles.icon, {
          [styles.hideOnHover]: iconHover,
        })}
      />
      {iconHover && (
        <Icon
          icon={iconHover}
          className={clsx(styles.iconHover, styles.showOnHover)}
        />
      )}
    </div>
  );
}

const variants = [
  "primary",
  "secondary",
  "success",
  "danger",
  "info",
  "warning",
  "light",
  "dark",
] as const;

function findVariant(schema: Schema) {
  if (schema.link) return "link";
  if (schema.css) {
    let variant = schema.css.replace("btn-", "");
    if (variants.includes(variant)) return variant;
  }
  return "primary";
}

export function Button(props: WidgetProps) {
  const { schema, widgetAtom } = props;
  const { showTitle = true, editable, icon, help } = schema;
  const { attrs } = useAtomValue(widgetAtom);
  const { actionExecutor } = useFormScope();
  const { title } = attrs;

  const variant = findVariant(schema);
  const [wait, setWait] = useState(false);

  const handleClick = useCallback(async () => {
    const { prompt, editOnSave, editable, onClick } = schema;
    if (prompt) {
      const confirmed = await dialogs.confirm({
        content: prompt,
      });
      if (!confirmed) return;
    }
    try {
      setWait(true);
      editable && editOnSave && (await editOnSave?.());
      await actionExecutor.waitFor();
      await actionExecutor.execute(onClick, {
        context: {
          _source: schema.name,
          _signal: schema.name,
        },
      });
    } finally {
      setWait(false);
    }
  }, [actionExecutor, schema]);

  const readonly = useReadonly(widgetAtom);
  const disabled = wait || readonly;
  const hasHelp = !editable && !!help;

  const BtnComponent: any = editable ? Box : Btn;
  const button = (
    <BtnComponent
      {...(BtnComponent === Btn
        ? { variant }
        : {
            title: help,
          })}
      {...(!disabled && {
        onClick: handleClick,
      })}
      disabled={disabled}
      className={clsx(styles.button, {
        [styles.help]: hasHelp,
      })}
    >
      <div className={styles.title}>
        {icon && <ButtonIcon {...props} />}
        {showTitle && title}
      </div>
    </BtnComponent>
  );

  function render() {
    return (
      <>
        {hasHelp && (
          <Tooltip content={() => <span>{help}</span>}>{button}</Tooltip>
        )}
        {hasHelp || button}
      </>
    );
  }

  if (schema.widget && schema.widget !== "button") {
    return render();
  }

  return <WidgetControl {...props}>{render()}</WidgetControl>;
}