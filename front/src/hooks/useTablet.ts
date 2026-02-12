import { useState, useCallback } from "react";
import { tabletService } from "@/services";
import { User, Rental, ApiError } from "@/types";

export const useTablet = () => {
  const [user, setUser] = useState<User | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signin = useCallback(async (serialNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tabletService.signin(serialNumber);
      setUser(response.user);
      setRentals(response.data);
      setToken(response.session);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : "認証に失敗しました";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkout = useCallback(
    async (barcode: string) => {
      if (!token) throw new Error("認証されていません");
      setLoading(true);
      setError(null);
      try {
        const response = await tabletService.checkout(barcode, token);
        setRentals((prev) => [...prev, response.data]);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError ? err.message : "貸出に失敗しました";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const returnItem = useCallback(
    async (barcode: string) => {
      if (!token) throw new Error("認証されていません");
      setLoading(true);
      setError(null);
      try {
        const response = await tabletService.returnItem(barcode, token);
        setRentals((prev) =>
          prev.filter((rental) => rental.item.barcode !== barcode)
        );
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError ? err.message : "返却に失敗しました";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const signout = useCallback(() => {
    setUser(null);
    setRentals([]);
    setToken(null);
    setError(null);
  }, []);

  return {
    user,
    rentals,
    token,
    loading,
    error,
    signin,
    checkout,
    returnItem,
    signout,
  };
};
