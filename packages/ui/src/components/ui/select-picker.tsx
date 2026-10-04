import * as React from "react";
import { Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";

import { cn } from "../../lib/utils";

import { Text } from "./text";

export const VIETNAM_CITIES = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Bình Dương",
  "Đồng Nai",
  "Bà Rịa - Vũng Tàu",
  "Khánh Hòa (Nha Trang)",
  "Lâm Đồng (Đà Lạt)",
  "Thừa Thiên Huế",
  "Quảng Ninh",
  "Bắc Ninh",
  "Hải Dương",
  "Nam Định",
  "Nghệ An",
  "Thanh Hóa",
  "Quảng Nam",
  "Bình Định (Quy Nhơn)",
  "Kiên Giang (Phú Quốc)",
  "An Giang",
  "Đắk Lắk (Buôn Ma Thuột)",
  "Gia Lai (Pleiku)",
  "Thái Nguyên",
  "Vĩnh Phúc",
];

export interface SelectPickerProps {
  value: string;
  onChange: (city: string) => void;
  options?: string[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectPicker({
  value,
  onChange,
  options = VIETNAM_CITIES,
  placeholder = "Chọn thành phố của bạn",
  error,
  disabled = false,
  className,
}: SelectPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter((item) => item.toLowerCase().includes(lower));
  }, [options, search]);

  function handleSelect(item: string) {
    onChange(item);
    setIsOpen(false);
    setSearch("");
  }

  return (
    <View className={cn("w-full gap-1.5", className)}>
      <Pressable
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        className={cn(
          "h-14 w-full flex-row items-center justify-between rounded-2xl border bg-secondary/50 px-4 active:bg-secondary",
          error ? "border-destructive" : "border-border",
          disabled && "opacity-50",
        )}
      >
        <Text
          className={cn(
            "text-base font-medium",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {value || placeholder}
        </Text>
        <View className="items-center justify-center pl-2">
          <Text className="text-sm text-muted-foreground">▼</Text>
        </View>
      </Pressable>

      {error ? (
        <Text className="px-1 text-xs font-medium text-destructive">{error}</Text>
      ) : null}

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => {
              setIsOpen(false);
              setSearch("");
            }}
          />
          <View className="max-h-[80%] rounded-t-3xl border-t border-border bg-card p-5 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4">
              <Text className="text-lg font-bold text-foreground">
                Chọn khu vực / thành phố
              </Text>
              <Pressable
                onPress={() => {
                  setIsOpen(false);
                  setSearch("");
                }}
                className="h-8 w-8 items-center justify-center rounded-full bg-secondary"
              >
                <Text className="text-sm font-bold text-muted-foreground">✕</Text>
              </Pressable>
            </View>

            {/* Search Input */}
            <View className="mb-3 h-11 flex-row items-center rounded-xl border border-input bg-secondary/60 px-3">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm kiếm tỉnh / thành phố..."
                placeholderTextColor="hsl(var(--muted-foreground))"
                className={cn(
                  "flex-1 text-sm text-foreground",
                  Platform.select({ web: "outline-none" }),
                )}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")}>
                  <Text className="text-xs text-muted-foreground">Xóa</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Options List */}
            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              <View className="gap-1 pb-4">
                {filteredOptions.length === 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-sm text-muted-foreground">
                      Không tìm thấy khu vực phù hợp
                    </Text>
                  </View>
                ) : (
                  filteredOptions.map((item) => {
                    const isSelected = item === value;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => handleSelect(item)}
                        className={cn(
                          "flex-row items-center justify-between rounded-xl px-4 py-3.5",
                          isSelected
                            ? "border border-primary/20 bg-primary-muted"
                            : "active:bg-secondary",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-base",
                            isSelected
                              ? "font-bold text-primary"
                              : "font-medium text-foreground",
                          )}
                        >
                          {item}
                        </Text>
                        {isSelected ? (
                          <Text className="text-base font-bold text-primary">✓</Text>
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
