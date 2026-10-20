import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import {
  meQuery,
  membershipConfigQuery,
  type MembershipPlanRead,
  type UserMembership,
} from "@repo/api-contract";

export const MEMBERSHIP_FEATURES = {
  SEE_WHO_LIKED_YOU: "SEE_WHO_LIKED_YOU",
  UNLIMITED_LIKES: "UNLIMITED_LIKES",
  VIP_BADGE: "VIP_BADGE",
  DIAMOND_BADGE: "DIAMOND_BADGE",
  PROFILE_BOOST: "PROFILE_BOOST",
} as const;

export type MembershipFeatureKey = keyof typeof MEMBERSHIP_FEATURES;

export interface UseMembershipResult {
  /** The raw membership object from the user account */
  membership: UserMembership | undefined;
  /** Whether the user currently has an active, unexpired VIP membership */
  isVip: boolean;
  /** Whether free mode is currently enabled system-wide */
  isFreeMode: boolean;
  /** Parsed expiration date if present */
  expiresAtDate: Date | null;
  /** Formatted expiration date string (e.g. "15/11/2026") */
  formattedExpiry: string;
  /** Days remaining until expiration */
  daysRemaining: number | null;
  /** The current plan definition if found in available plans */
  currentPlan: MembershipPlanRead | null;
  /** All available plans sorted by sort_order */
  plans: MembershipPlanRead[];
  /** Check if the user has access to a specific feature */
  hasFeature: (featureCode: string) => boolean;
  /** Loading state of either user or membership config query */
  isLoading: boolean;
  /** Refetching state */
  isRefetching: boolean;
  /** Function to trigger a refresh of both queries */
  refetch: () => void;
}

export function useMembership(): UseMembershipResult {
  const meQueryData = useQuery(meQuery());
  const configQueryData = useQuery(membershipConfigQuery());

  const membership = meQueryData.data?.account?.membership;
  const config = configQueryData.data;

  // Free mode is enabled if explicitly true or during default fallback
  const isFreeMode = config?.free_mode_enabled ?? true;

  const expiresAtDate = React.useMemo(() => {
    if (!membership?.expiresAt) return null;
    const parsed = new Date(membership.expiresAt);
    return isNaN(parsed.getTime()) ? null : parsed;
  }, [membership?.expiresAt]);

  const isVip = React.useMemo(() => {
    if (!membership?.isActive) return false;
    if (!expiresAtDate) return true; // active with no expiration is lifetime
    return expiresAtDate.getTime() > Date.now();
  }, [membership?.isActive, expiresAtDate]);

  const daysRemaining = React.useMemo(() => {
    if (!expiresAtDate) return null;
    const diffMs = expiresAtDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [expiresAtDate]);

  const formattedExpiry = React.useMemo(() => {
    if (!expiresAtDate) return "";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(expiresAtDate);
    } catch {
      return expiresAtDate.toLocaleDateString("vi-VN");
    }
  }, [expiresAtDate]);

  const plans = React.useMemo(() => {
    if (!config?.plans) return [];
    return [...config.plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [config?.plans]);

  const currentPlan = React.useMemo(() => {
    if (!membership?.planCode || plans.length === 0) return null;
    return plans.find((p) => p.code === membership.planCode) ?? null;
  }, [membership?.planCode, plans]);

  const hasFeature = React.useCallback(
    (featureCode: string): boolean => {
      // Rule: Free mode grants access to all VIP features unconditionally
      if (isFreeMode) return true;

      // If not VIP, no special features are granted
      if (!isVip) return false;

      // If active plan defines features, check if code exists in features
      if (currentPlan?.features && currentPlan.features.length > 0) {
        return currentPlan.features.includes(featureCode);
      }

      // Fallback heuristics for 99k vs 49k
      if (membership?.planCode === "99k") {
        return true;
      }

      if (membership?.planCode === "49k") {
        const basicFeatures = [
          MEMBERSHIP_FEATURES.SEE_WHO_LIKED_YOU,
          MEMBERSHIP_FEATURES.UNLIMITED_LIKES,
          MEMBERSHIP_FEATURES.VIP_BADGE,
        ];
        return (basicFeatures as string[]).includes(featureCode);
      }

      return false;
    },
    [isFreeMode, isVip, currentPlan, membership?.planCode],
  );

  const refetch = React.useCallback(() => {
    meQueryData.refetch();
    configQueryData.refetch();
  }, [meQueryData, configQueryData]);

  return {
    membership,
    isVip,
    isFreeMode,
    expiresAtDate,
    formattedExpiry,
    daysRemaining,
    currentPlan,
    plans,
    hasFeature,
    isLoading: meQueryData.isLoading || configQueryData.isLoading,
    isRefetching: meQueryData.isRefetching || configQueryData.isRefetching,
    refetch,
  };
}
