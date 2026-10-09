import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { discoveryCountQuery } from "@repo/api-contract";
import {
  Button,
  RangeSlider,
  SegmentedControl,
  type SegmentOption,
  SelectPicker,
  Slider,
  Text,
} from "@repo/ui";

export type GenderFilterOption = "female" | "male" | "all";

export interface DiscoveryFilterState {
  gender: GenderFilterOption;
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  city: string;
}

export const DEFAULT_FILTERS: DiscoveryFilterState = {
  gender: "female",
  ageMin: 22,
  ageMax: 30,
  maxDistanceKm: 10,
  city: "",
};

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: DiscoveryFilterState;
  onApply: (filters: DiscoveryFilterState) => void;
}

const GENDER_OPTIONS: SegmentOption<GenderFilterOption>[] = [
  { value: "female", label: "Nữ", symbol: "♀" },
  { value: "male", label: "Nam", symbol: "♂" },
  { value: "all", label: "Tất cả", symbol: "👥" },
];

const AGE_LABELS = [
  { value: 18, label: "18" },
  { value: 25, label: "25" },
  { value: 35, label: "35" },
  { value: 50, label: "50+" },
];

const DISTANCE_LABELS = [
  { value: 1, label: "1 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
];

export function FilterModal({
  visible,
  onClose,
  filters: initialFilters,
  onApply,
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * 0.82);

  const [draftFilters, setDraftFilters] =
    React.useState<DiscoveryFilterState>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] =
    React.useState<DiscoveryFilterState>(initialFilters);

  // Sync draft filters when modal opens
  React.useEffect(() => {
    if (visible) {
      setDraftFilters(initialFilters);
      setDebouncedFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  // Debounce numeric sliders (age, distance) so continuous dragging does not flood the network
  React.useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setDebouncedFilters((prev) => ({
        ...prev,
        ageMin: draftFilters.ageMin,
        ageMax: draftFilters.ageMax,
        maxDistanceKm: draftFilters.maxDistanceKm,
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [draftFilters.ageMin, draftFilters.ageMax, draftFilters.maxDistanceKm, visible]);

  // Instant update for discrete button/picker changes (gender, city)
  const handleGenderChange = (val: GenderFilterOption) => {
    setDraftFilters((prev) => ({ ...prev, gender: val }));
    setDebouncedFilters((prev) => ({ ...prev, gender: val }));
  };

  const handleCityChange = (city: string) => {
    setDraftFilters((prev) => ({ ...prev, city }));
    setDebouncedFilters((prev) => ({ ...prev, city }));
  };

  // Construct query parameters for live candidate counting
  const queryParams = React.useMemo(() => {
    let genders: Array<"female" | "male" | "other"> | undefined;
    if (debouncedFilters.gender === "all") {
      genders = ["female", "male", "other"];
    } else {
      genders = [debouncedFilters.gender];
    }

    return {
      genders,
      age_min: debouncedFilters.ageMin,
      age_max: debouncedFilters.ageMax,
      max_distance_km: debouncedFilters.maxDistanceKm,
      cities: debouncedFilters.city ? [debouncedFilters.city] : undefined,
    };
  }, [debouncedFilters]);

  // Live count query for the preview button with smooth previous data keeping
  const { data: countData, isFetching: isCounting } = useQuery({
    ...discoveryCountQuery(queryParams),
    enabled: visible,
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  const count = countData?.count ?? 0;

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setDebouncedFilters(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  const currentGenderLabel =
    GENDER_OPTIONS.find((o) => o.value === draftFilters.gender)?.label ?? "Nữ";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        {/* Backdrop tap to close */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Bottom Sheet Container */}
        <View
          style={{
            height: sheetHeight,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          className="w-full rounded-t-3xl border-t border-border/40 bg-background shadow-2xl"
        >
          {/* Sheet Handle */}
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </View>

          {/* Header */}
          <View className="h-14 flex-row items-center justify-between border-b border-border/30 px-5">
            <Pressable onPress={handleReset} hitSlop={10}>
              <Text className="text-sm font-semibold text-muted-foreground">Đặt lại</Text>
            </Pressable>

            <Text className="text-lg font-black tracking-tight text-foreground">
              Bộ lọc tìm kiếm
            </Text>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center rounded-full bg-secondary"
            >
              <Text className="text-sm font-bold text-muted-foreground">✕</Text>
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            {/* 1. Giới tính muốn tìm (Tái sử dụng SegmentedControl common) */}
            <View className="mb-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">
                  Giới tính muốn tìm
                </Text>
                <Text className="text-sm font-bold text-primary">
                  {currentGenderLabel}
                </Text>
              </View>

              <SegmentedControl
                variant="solid"
                options={GENDER_OPTIONS}
                value={draftFilters.gender}
                onChange={handleGenderChange}
              />
            </View>

            {/* 2. Độ tuổi */}
            <View className="mb-6">
              <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base">🎂</Text>
                  <Text className="text-base font-bold text-foreground">Độ tuổi</Text>
                </View>

                <View className="rounded-full bg-primary-muted px-3 py-1">
                  <Text className="text-xs font-black text-primary">
                    {draftFilters.ageMin} -{" "}
                    {draftFilters.ageMax >= 50 ? "50+" : draftFilters.ageMax} tuổi
                  </Text>
                </View>
              </View>

              <RangeSlider
                min={18}
                max={50}
                step={1}
                value={[draftFilters.ageMin, draftFilters.ageMax]}
                onChange={([low, high]) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    ageMin: low,
                    ageMax: high,
                  }))
                }
                labels={AGE_LABELS}
              />
            </View>

            {/* 3. Khoảng cách tối đa */}
            <View className="mb-6">
              <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base">🧭</Text>
                  <Text className="text-base font-bold text-foreground">
                    Khoảng cách tối đa
                  </Text>
                </View>

                <View className="rounded-full bg-primary-muted px-3 py-1">
                  <Text className="text-xs font-black text-primary">
                    {draftFilters.maxDistanceKm} km
                  </Text>
                </View>
              </View>

              <Slider
                min={1}
                max={100}
                step={1}
                value={draftFilters.maxDistanceKm}
                onChange={(val) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    maxDistanceKm: val,
                  }))
                }
                labels={DISTANCE_LABELS}
              />
            </View>

            {/* 4. Khu vực / Địa điểm */}
            <View className="mb-8">
              <Text className="mb-2.5 text-base font-bold text-foreground">
                Khu vực / Địa điểm
              </Text>
              <SelectPicker
                value={draftFilters.city}
                onChange={handleCityChange}
                placeholder="Tất cả khu vực (Toàn quốc)"
              />
            </View>
          </ScrollView>

          {/* Footer Action Button */}
          <View className="border-t border-border/30 px-5 pt-3">
            <Button
              size="lg"
              onPress={handleApply}
              className="h-14 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/30"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-base font-black text-primary-foreground">
                  ▽ Áp dụng bộ lọc ({count} hồ sơ)
                </Text>
                {isCounting && <ActivityIndicator color="#ffffff" size="small" />}
              </View>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
