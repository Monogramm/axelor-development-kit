import { useAtom } from "jotai";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Box, clsx, Portal } from "@axelor/ui";

import { Field } from "@/services/client/meta.types";
import convert from "@/utils/convert";
import format from "@/utils/format";
import { useViewContext } from "@/view-containers/views/scope";

import { FieldControl, FieldProps } from "../../builder";
import { useScale } from "../decimal/hooks";

import styles from "./slider.module.scss";

export function Slider(props: FieldProps<string | number>) {
  const { schema, readonly, valueAtom, formAtom, widgetAtom } = props;

  const scale = useScale(widgetAtom, formAtom, schema);

  const getViewContext = useViewContext();

  const isDecimal =
    schema.widget === "decimal" || schema.serverType === "DECIMAL";
  const { minSize: min = 0, maxSize: max = 100, widgetAttrs } = schema;
  const {
    step = isDecimal ? Math.pow(10, -scale) : 1,
    sliderShowMinMax = false,
  } = widgetAttrs;

  const [value, setValue] = useAtom(valueAtom);
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value ?? min);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });

  const sliderRef = useRef<HTMLDivElement | null>(null);

  function extractScale(number: number | null | undefined) {
    if (!number || isNaN(number)) return 0;
    const parts = number.toString().split(".");
    if (parts.length > 2) return null;
    return parts[1] ? parts[1].length : 0;
  }

  const parse = useCallback(
    (val?: string | number | null) =>
      convert(val, { props: { ...schema, scale } }),
    [schema, scale],
  );

  const formatText = useCallback(
    (
      text: string | number | null | undefined,
      customScale?: number | null | undefined,
    ) =>
      text != null
        ? format(text, {
            props: {
              ...schema,
              ...schema.widgetAttrs,
              scale: isNaN(customScale as number) ? scale : customScale,
            } as Field,
            context: getViewContext(),
          })
        : "",
    [getViewContext, scale, schema],
  );

  const displayedMin = useMemo(
    () => formatText(min, extractScale(min)),
    [formatText, min],
  );
  const displayedMax = useMemo(
    () => formatText(max, extractScale(max)),
    [formatText, max],
  );
  const displayedValue = useMemo(
    () => formatText(currentValue),
    [currentValue, formatText],
  );

  const updateSliderValue = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const sliderWidth = rect.width;
      const clickPosition = clientX - rect.left;
      let newValue = (clickPosition / sliderWidth) * (max - min) + Number(min);

      newValue = Math.min(Math.max(newValue, min), max);
      newValue = +(Math.round(newValue / step) * step);

      setCurrentValue(parse(newValue));
      setTooltipPosition({
        left: Math.min(Math.max(clientX, rect.left), rect.left + rect.width),
        top: rect.top - 45,
      });
    },
    [max, min, parse, step],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging) return;

      updateSliderValue(event.clientX);
    },
    [isDragging, updateSliderValue],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);

    if (value != currentValue) {
      setValue(parse(currentValue), true);
      setCurrentValue(parse(currentValue));
    }
  }, [currentValue, parse, setValue, value]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!readonly) {
        setIsDragging(true);
        updateSliderValue(event.clientX);
      }
    },
    [readonly, updateSliderValue],
  );

  const thumbPosition = useMemo(() => {
    const clampedValue = Math.min(Math.max(currentValue, min), max);

    return `${((clampedValue - min) / (max - min)) * 100}%`;
  }, [max, min, currentValue]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDragging, value]);

  useEffect(() => {
    setCurrentValue(value);

    if (!sliderRef.current || value === undefined || value === null) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clampedValue = Math.min(Math.max(Number(value), min), max);

    setTooltipPosition({
      left: rect.left + (clampedValue / max) * rect.width,
      top: rect.top - 45,
    });
  }, [max, min, parse, value]);

  return (
    <FieldControl {...props} titleActions={<>{displayedValue}</>}>
      <Box
        className={styles.trackWrapper}
        opacity={readonly ? 50 : 100}
        mt={1}
        rounded={3}
        bgColor="body-secondary"
        borderColor="primary"
      >
        <Box
          className={clsx(styles.track, { [styles.readonly]: readonly })}
          ref={sliderRef}
          display="flex"
          flex={1}
          position="relative"
          onMouseDown={handleMouseDown}
        >
          <Box h={100} bgColor="primary" style={{ width: thumbPosition }} />
          <Box
            className={styles.cursor}
            rounded="circle"
            bgColor="body"
            border={true}
            borderColor="primary"
            borderWidth={2}
            style={{ left: thumbPosition }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />

          <SliderTooltip
            position={tooltipPosition}
            isVisible={(showTooltip || isDragging) && !!displayedValue}
          >
            {displayedValue}
          </SliderTooltip>
        </Box>
      </Box>
      {sliderShowMinMax && (
        <Box display="flex" justifyContent="space-between">
          <Box>{displayedMin}</Box>
          <Box>{displayedMax}</Box>
        </Box>
      )}
    </FieldControl>
  );
}

function SliderTooltip({
  children,
  position,
  isVisible,
}: PropsWithChildren<{
  position: { left: number; top: number };
  isVisible: boolean;
}>) {
  return (
    <Portal container={document.body}>
      <Box
        className={styles.tooltip}
        bgColor="primary"
        color="white"
        style={{
          left: position.left,
          top: position.top,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {children}
      </Box>
    </Portal>
  );
}
