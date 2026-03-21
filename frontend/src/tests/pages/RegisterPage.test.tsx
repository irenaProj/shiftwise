import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders, clearAuth } from "../utils";
import { RegisterPage } from "../../pages/RegisterPage";
import { server } from "../setup";
import { fakeUser, fakeWorkspace } from "../msw/handlers";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Record<string, string> = {},
) {
  const values = {
    name: "New User",
    email: "new.user@demo.com",
    password: "password123",
    workspace: "New Workspace",
    ...overrides,
  };
  await user.type(screen.getByPlaceholderText("Jane Smith"), values.name);
  await user.type(
    screen.getByPlaceholderText("jane@company.com"),
    values.email,
  );
  await user.type(
    screen.getByPlaceholderText("Min. 8 characters"),
    values.password,
  );
  await user.type(screen.getByPlaceholderText(/cafe/i), values.workspace);
}

describe("RegisterPage", () => {
  beforeEach(() => {
    clearAuth();
    mockNavigate.mockClear();
  });

  it("renders the registration form", () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText("Create your workspace")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("jane@company.com")).toBeInTheDocument();
  });

  it("navigates to dashboard on successful registration", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    // After successful register + login, loading state appears then resolves
    await waitFor(
      () => {
        // Button should no longer show loading — form submitted successfully
        expect(
          screen.queryByText("Creating workspace…"),
        ).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  }, 10000);

  it("shows error when email is already in use", async () => {
    server.use(
      http.post("http://localhost:3001/api/auth/register", () => {
        return HttpResponse.json(
          { error: "Email already in use", code: "CONFLICT" },
          { status: 409 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await fillForm(user, { email: "existing@demo.com" });
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/email already in use|registration failed/i),
      ).toBeInTheDocument();
    });
  });

  it("has a link back to login", () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows loading state while submitting", async () => {
    server.use(
      http.post("http://localhost:3001/api/auth/register", async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json(
          { accessToken: "token", user: fakeUser },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /creating workspace/i }),
      ).toBeDisabled();
    });
  });
});
