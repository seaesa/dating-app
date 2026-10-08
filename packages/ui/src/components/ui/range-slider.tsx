import * as React from "react";
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponderGestureState,
} from "react-native";
import { PanResponder, View } from "react-native";

import { cn } from "../../lib/utils";

import { Text } from "./text";

export interface SliderLabel {
  value: number;
  label: string;
}

export interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onSlidingComplete?: (value: [number, number]) => void;
  labels?: SliderLabel[];
  className?: string;
  disabled?: boolean;
}

const THUMB_SIZE = 28;
const THUMB_RADIUS = THUMB_SIZE / 2;

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onSlidingComplete,
  labels,
  className,
  disabled = false,
}: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = React.useState<number>(0);

  // Sync refs so PanResponders have stable references and never re-create during touch gestures
  const valueRef = React.useRef<[number, number]>(value);
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

  // Dedicated PanResponder for Low Thumb - created ONCE with [] deps
  const lowStartValRef = React.useRef<number>(value[0]);
  const lowPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          lowStartValRef.current = valueRef.current[0];
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
          const raw = lowStartValRef.current + deltaVal;
          const currentHigh = valueRef.current[1];
          const clamped = Math.round(raw / stepVal) * stepVal;
          const newLow = Math.min(currentHigh - stepVal, Math.max(minVal, clamped));
          onChangeRef.current([newLow, currentHigh]);
        },
        onPanResponderRelease: () => {
          onSlidingCompleteRef.current?.(valueRef.current);
        },
      }),
    [],
  );

  // Dedicated PanResponder for High Thumb - created ONCE with [] deps
  const highStartValRef = React.useRef<number>(value[1]);
  const highPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          highStartValRef.current = valueRef.current[1];
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
          const raw = highStartValRef.current + deltaVal;
          const currentLow = valueRef.current[0];
          const clamped = Math.round(raw / stepVal) * stepVal;
          const newHigh = Math.max(currentLow + stepVal, Math.min(maxVal, clamped));
          onChangeRef.current([currentLow, newHigh]);
        },
        onPanResponderRelease: () => {
          onSlidingCompleteRef.current?.(valueRef.current);
        },
      }),
    [],
  );

  // Track PanResponder for tapping outside the thumbs - created ONCE with [] deps
  const trackActiveThumbRef = React.useRef<"low" | "high">("low");
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

          const [currentLow, currentHigh] = valueRef.current;
          const distLow = Math.abs(tapVal - currentLow);
          const distHigh = Math.abs(tapVal - currentHigh);

          if (distLow <= distHigh) {
            trackActiveThumbRef.current = "low";
            const newLow = Math.min(currentHigh - stepVal, Math.max(minVal, tapVal));
            trackStartValRef.current = newLow;
            onChangeRef.current([newLow, currentHigh]);
          } else {
            trackActiveThumbRef.current = "high";
            const newHigh = Math.max(currentLow + stepVal, Math.min(maxVal, tapVal));
            trackStartValRef.current = newHigh;
            onChangeRef.current([currentLow, newHigh]);
          }
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
          const [currentLow, currentHigh] = valueRef.current;

          if (trackActiveThumbRef.current === "low") {
            const newLow = Math.min(currentHigh - stepVal, Math.max(minVal, clamped));
            onChangeRef.current([newLow, currentHigh]);
          } else {
            const newHigh = Math.max(currentLow + stepVal, Math.min(maxVal, clamped));
            onChangeRef.current([currentLow, newHigh]);
          }
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

  const lowPos = getPositionFromValue(value[0]);
  const highPos = getPositionFromValue(value[1]);

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
              left: lowPos,
              width: Math.max(0, highPos - lowPos),
            }}
            className="absolute h-2 rounded-full bg-primary"
          />
        )}

        {/* Low Thumb */}
        {trackWidth > 0 && (
          <View
            {...lowPanResponder.panHandlers}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              left: Math.max(0, Math.min(trackWidth - THUMB_SIZE, lowPos - THUMB_RADIUS)),
            }}
            className="absolute h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-background shadow-md shadow-black/20"
          >
            <View pointerEvents="none" className="h-2.5 w-2.5 rounded-full bg-primary" />
          </View>
        )}

        {/* High Thumb */}
        {trackWidth > 0 && (
          <View
            {...highPanResponder.panHandlers}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              left: Math.max(
                0,
                Math.min(trackWidth - THUMB_SIZE, highPos - THUMB_RADIUS),
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
