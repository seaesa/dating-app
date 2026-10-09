import * as React from "react";
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponderGestureState,
} from "react-native";
import { PanResponder, View } from "react-native";

import { cn } from "../../lib/utils";

import type { SliderLabel } from "./range-slider";
import { Text } from "./text";

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  labels?: SliderLabel[];
  className?: string;
  disabled?: boolean;
}

const THUMB_SIZE = 28;
const THUMB_RADIUS = THUMB_SIZE / 2;

export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onSlidingComplete,
  labels,
  className,
  disabled = false,
}: SliderProps) {
  const [trackWidth, setTrackWidth] = React.useState<number>(0);

  // Sync refs so PanResponders have stable references and never re-create during touch gestures
  const valueRef = React.useRef<number>(value);
  valueRef.current = value;

  const trackWidthRef = React.useRef<number>(0);
  trackWidthRef.current = trackWidth;

  const minRef = React.useRef(min);
  minRef.current = min;

  const maxRef = React.useRef(max);
  maxRef.current = max;

  const stepRef = React.useRef(step);
  stepRef.current = step;

  const disabledRef = React.useRef(disabled);
  disabledRef.current = disabled;

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const onSlidingCompleteRef = React.useRef(onSlidingComplete);
  onSlidingCompleteRef.current = onSlidingComplete;

  const getPositionFromValue = (v: number): number => {
    if (trackWidth <= 0 || max === min) return 0;
    const ratio = (v - min) / (max - min);
    return Math.max(0, Math.min(trackWidth, ratio * trackWidth));
  };

  // Dedicated PanResponder for the thumb - created ONCE with [] deps
  const thumbStartValRef = React.useRef<number>(value);
  const thumbPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          thumbStartValRef.current = valueRef.current;
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const tw = trackWidthRef.current;
          if (disabledRef.current || tw <= 0) return;
          const minVal = minRef.current;
          const maxVal = maxRef.current;
          const stepVal = stepRef.current;
          const deltaVal = (gestureState.dx / tw) * (maxVal - minVal);
          const raw = thumbStartValRef.current + deltaVal;
          const clamped = Math.round(raw / stepVal) * stepVal;
          const newVal = Math.max(minVal, Math.min(maxVal, clamped));
          onChangeRef.current(newVal);
        },
        onPanResponderRelease: () => {
          onSlidingCompleteRef.current?.(valueRef.current);
        },
      }),
    [],
  );

  // PanResponder for track tap & drag - created ONCE with [] deps
  const trackStartValRef = React.useRef<number>(0);
  const trackPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          if (disabledRef.current) return;
          const tw = trackWidthRef.current;
          if (tw <= 0) return;
          const minVal = minRef.current;
          const maxVal = maxRef.current;
          const stepVal = stepRef.current;
          const tapX = evt.nativeEvent.locationX;
          const ratio = Math.max(0, Math.min(1, tapX / tw));
          const tapRaw = minVal + ratio * (maxVal - minVal);
          const tapVal = Math.round(tapRaw / stepVal) * stepVal;
          const newVal = Math.max(minVal, Math.min(maxVal, tapVal));
          trackStartValRef.current = newVal;
          onChangeRef.current(newVal);
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const tw = trackWidthRef.current;
          if (disabledRef.current || tw <= 0) return;
          const minVal = minRef.current;
          const maxVal = maxRef.current;
          const stepVal = stepRef.current;
          const deltaVal = (gestureState.dx / tw) * (maxVal - minVal);
          const raw = trackStartValRef.current + deltaVal;
          const clamped = Math.round(raw / stepVal) * stepVal;
          const newVal = Math.max(minVal, Math.min(maxVal, clamped));
          onChangeRef.current(newVal);
        },
        onPanResponderRelease: () => {
          onSlidingCompleteRef.current?.(valueRef.current);
        },
      }),
    [],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const currentPos = getPositionFromValue(value);

  return (
    <View className={cn("w-full py-2", className)}>
      <View
        onLayout={onLayout}
        {...trackPanResponder.panHandlers}
        className="relative h-12 w-full justify-center"
      >
        {/* Background Track */}
        <View pointerEvents="none" className="h-2 w-full rounded-full bg-secondary" />

        {/* Selected Range Highlight */}
        {trackWidth > 0 && (
          <View
            pointerEvents="none"
            style={{
              left: 0,
              width: Math.min(trackWidth, currentPos),
            }}
            className="absolute h-2 rounded-full bg-primary"
          />
        )}

        {/* Thumb */}
        {trackWidth > 0 && (
          <View
            {...thumbPanResponder.panHandlers}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              left: Math.max(
                0,
                Math.min(trackWidth - THUMB_SIZE, currentPos - THUMB_RADIUS),
              ),
            }}
            className="absolute h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background shadow-md shadow-black/20"
          >
            <View pointerEvents="none" className="h-2.5 w-2.5 rounded-full bg-primary" />
          </View>
        )}
      </View>

      {/* Axis Labels */}
      {labels && labels.length > 0 && (
        <View
          pointerEvents="none"
          className="mt-1 flex-row items-center justify-between px-0.5"
        >
          {labels.map((item) => (
            <Text
              key={item.value}
              className="text-xs font-semibold text-muted-foreground"
            >
              {item.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
