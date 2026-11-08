import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../superbaseclient.ts";
import { useAuth } from "../Provider/AuthProvider";
import { authStyles } from "../authStyles";
import { getFromPath } from "../getFromPath";
import { t } from "../../SearchPage/constants/messages";

const PASSWORD_MIN = 6;

type SignInFormValues = {
  email: string;
  password: string;
};

export const SignInPage = () => {
  const { session } = useAuth();
  const location = useLocation();
  const from = getFromPath(location.state);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignInFormValues>({
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Typed formData to match your SignInFormValues
  const onSubmit = async (formData: SignInFormValues) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError("root", { message: error.message });
        return;
      }
    } catch {
      setError("root", { message: t("auth.error.unexpected") });
    }
  };

  if (session) return <Navigate to={from} replace />;

  return (
    <div className={authStyles.page}>
      <div className={authStyles.card}>
        <h1 className={authStyles.title}>{t("auth.signin.title")}</h1>
        <p className={authStyles.subtitle}>{t("auth.signin.subtitle")}</p>
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
              autoComplete="current-password"
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

          {errors.root && (
            <p className={authStyles.rootError}>{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={authStyles.button}
          >
            {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>
        <p className={authStyles.footer}>
          {t("auth.signin.noAccount")}{" "}
          <Link
            to="/signup"
            state={location.state}
            className={authStyles.link}
          >
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
};
