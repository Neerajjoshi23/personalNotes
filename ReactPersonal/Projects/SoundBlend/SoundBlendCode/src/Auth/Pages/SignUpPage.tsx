import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../superbaseclient";
import { useAuth } from "../Provider/AuthProvider";
import { authStyles } from "../authStyles";
import { getFromPath } from "../getFromPath";
import { t } from "../../SearchPage/constants/messages";

const PASSWORD_MIN = 6;

type SignUpFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export const SignUpPage = () => {
  const { session } = useAuth();
  const location = useLocation();
  const from = getFromPath(location.state);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpFormValues>({
    mode: "onTouched",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async ({ email, password }: SignUpFormValues) => {
    try {
      // The confirmation link opens a new tab where router state is lost, so carry `from` in the redirect URL
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${from}` },
      });
      if (error) {
        setError("root", { message: error.message });
        return;
      }
      // No session means email confirmation is required
      if (!data.session) setNeedsConfirmation(true);
    } catch {
      setError("root", { message: t("auth.error.unexpected") });
    }
  };

  if (session) return <Navigate to={from} replace />;

  if (needsConfirmation) {
    return (
      <div className={authStyles.page}>
        <div className={authStyles.card}>
          <h1 className={authStyles.title}>{t("auth.confirm.title")}</h1>
          <p className={authStyles.subtitle}>{t("auth.confirm.body")}</p>
          <Link to="/signin" className={authStyles.link}>
            {t("auth.confirm.goSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={authStyles.page}>
      <div className={authStyles.card}>
        <h1 className={authStyles.title}>{t("auth.signup.title")}</h1>
        <p className={authStyles.subtitle}>{t("auth.signup.subtitle")}</p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={authStyles.form}
          noValidate
        >
          <div className={authStyles.field}>
            <label htmlFor="email" className={authStyles.label}>
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              className={authStyles.input}
              {...register("email", {
                required: t("auth.error.emailRequired"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("auth.error.emailInvalid"),
                },
              })}
            />
            {errors.email && (
              <p className={authStyles.error}>{errors.email.message}</p>
            )}
          </div>

          <div className={authStyles.field}>
            <label htmlFor="password" className={authStyles.label}>
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={authStyles.input}
              {...register("password", {
                required: t("auth.error.passwordRequired"),
                minLength: {
                  value: PASSWORD_MIN,
                  message: t("auth.error.passwordMin", { min: PASSWORD_MIN }),
                },
              })}
            />
            {errors.password && (
              <p className={authStyles.error}>{errors.password.message}</p>
            )}
          </div>

          <div className={authStyles.field}>
            <label htmlFor="confirmPassword" className={authStyles.label}>
              {t("auth.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={authStyles.input}
              {...register("confirmPassword", {
                required: t("auth.error.confirmRequired"),
                validate: (v) =>
                  v === getValues("password") || t("auth.error.mismatch"),
              })}
            />
            {errors.confirmPassword && (
              <p className={authStyles.error}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className={authStyles.rootError}>{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={authStyles.button}
          >
            {isSubmitting ? t("auth.signingUp") : t("auth.signUp")}
          </button>
        </form>
        <p className={authStyles.footer}>
          {t("auth.signup.haveAccount")}{" "}
          <Link
            to="/signin"
            state={location.state}
            className={authStyles.link}
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
};
