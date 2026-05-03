import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type SettingsData = {
  settings: Record<string, string>;
  status: { smtpConfigured: boolean; cloudinaryConfigured: boolean };
};

type Section = "email" | "cloudinary" | "store" | "facebook" | "twitter" | "whatsapp" | "apikeys" | "payments";

// ... existing code remains unchanged above
