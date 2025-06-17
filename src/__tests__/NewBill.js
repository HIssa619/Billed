/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { bill } from "../__mocks__/mockedBill.js";
import router from "../app/Router.js";
jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee on NewBill page", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		Object.defineProperty(window, "localStorage", { value: localStorageMock });
		window.localStorage.setItem(
			"user",
			JSON.stringify({ type: "Employee", email: "a@a" })
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("When I am on newBill page", () => {
		test("Then mail icon in vertical layout should be highlighted", async () => {
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.NewBill);

			await waitFor(() => screen.getByTestId("icon-mail"));
			const mailIcon = screen.getByTestId("icon-mail");
			expect(mailIcon).toHaveClass("active-icon");
		});

		test("Then I upload a valid file", async () => {
			document.body.innerHTML = NewBillUI();
			const onNavigate = jest.fn();
			const newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const inputFile = screen.getByTestId("file");
			const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
			inputFile.addEventListener("change", handleChangeFile);

			const file = new File(["dummy content"], "test.jpg", {
				type: "image/jpg",
			});
			userEvent.upload(inputFile, file);

			expect(inputFile.files[0].name).toBe("test.jpg");
			expect(handleChangeFile).toHaveBeenCalled();

			const { fileUrl, key } = await mockStore.bills().create({
				shouldFailWith404: false,
				shouldFailWith500: false,
			});
			expect(fileUrl).toBe("https://localhost:3456/images/test.jpg");
			expect(key).toBe("1234");
		});

		test("FormData should append the correct file and email", async () => {
			document.body.innerHTML = NewBillUI();
			const onNavigate = jest.fn();
			const newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const formData = new FormData();
			const appendSpy = jest.spyOn(formData, "append");
			window.FormData = jest.fn(() => formData);

			const file = new File(["dummy content"], "test.jpg", {
				type: "image/jpg",
			});
			const inputFile = screen.getByTestId("file");

			userEvent.upload(inputFile, file);
			await newBill.handleChangeFile({ target: inputFile });

			expect(appendSpy).toHaveBeenCalledWith("file", file);
			expect(appendSpy).toHaveBeenCalledWith(
				"email",
				JSON.parse(localStorage.getItem("user")).email
			);
		});

		test("Then an alert should be displayed for invalid file", async () => {
			document.body.innerHTML = NewBillUI();
			const newBill = new NewBill({
				document,
				onNavigate: jest.fn(),
				store: mockStore,
				localStorage: window.localStorage,
			});

			const invalidFile = new File(["dummy content"], "test.txt", {
				type: "text/plain",
			});
			const inputFile = screen.getByTestId("file");

			jest.spyOn(window, "alert").mockImplementation(() => {});

			userEvent.upload(inputFile, invalidFile);
			expect(window.alert).toHaveBeenCalledWith(
				"Le justificatif doit être au format jpeg, jpg ou png"
			);
		});
	});

	describe("When I submit the form", () => {
		let newBill;

		beforeEach(() => {
			document.body.innerHTML = NewBillUI();
			newBill = new NewBill({
				document,
				onNavigate: jest.fn(),
				store: mockStore,
				localStorage: window.localStorage,
			});
		});
		afterEach(() => {
			jest.clearAllMocks();
		});
		test("Then handleSubmit should be called", () => {
			const form = screen.getByTestId("form-new-bill");
			const handleSubmit = jest.fn(newBill.handleSubmit);
			form.addEventListener("submit", handleSubmit);
			fireEvent.submit(form);

			expect(handleSubmit).toHaveBeenCalledTimes(1);
		});

		test("Then it should navigate to Bills page on valid submission", async () => {
			fireEvent.change(screen.getByTestId("expense-type"), {
				target: { value: "Transports" },
			});
			fireEvent.change(screen.getByTestId("expense-name"), {
				target: { value: "Vol Paris-Londres" },
			});
			fireEvent.change(screen.getByTestId("datepicker"), {
				target: { value: "2022-08-11" },
			});
			fireEvent.change(screen.getByTestId("amount"), {
				target: { value: "300" },
			});
			fireEvent.change(screen.getByTestId("vat"), { target: { value: "70" } });
			fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });

			fireEvent.submit(screen.getByTestId("form-new-bill"));

			await waitFor(() =>
				expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"])
			);
		});
	});
});

//////////////////////////////////////////
/************************test integration post****************************/
//////////////////////////////////////////
describe("When I navigate to Dashboard employee", () => {
	describe("Given I am a user connected as Employee, and a user post a newBill", () => {
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
		});
		test("Add a bill to the mock API ", async () => {
			const billMocked = await mockStore.bills().update(bill);
			expect(billMocked.id).toBe("47qAXb6fIm2zOKkLzMro");
			expect(billMocked).toStrictEqual(bill);
		});
		describe("When an error occurs on API", () => {
			beforeEach(() => {
				Object.defineProperty(window, "localStorage", {
					value: localStorageMock,
				});
				window.localStorage.setItem(
					"user",
					JSON.stringify({
						type: "Employee",
					})
				);

				document.body.innerHTML = NewBillUI();
			});
			test("Add bills to API and fails with 404 message error", async () => {
				const errorSpy = jest
					.spyOn(console, "error")
					.mockImplementation(() => {});
				await expect(
					mockStore.bills().create({ shouldFailWith404: true })
				).rejects.toThrow("Erreur 404");
				expect(errorSpy).toHaveBeenCalled();
				const error = errorSpy.mock.calls[0][0];
				expect(error.message).toBe("Erreur 404");
				errorSpy.mockRestore();
			});
			test("Add bills to API and fails with 500 message error", async () => {
				const errorSpy = jest
					.spyOn(console, "error")
					.mockImplementation(() => {});
				await expect(
					mockStore.bills().create({ shouldFailWith500: true })
				).rejects.toThrow("Erreur 500");
				expect(errorSpy).toHaveBeenCalled();
				const error = errorSpy.mock.calls[0][0];
				expect(error.message).toBe("Erreur 500");
				errorSpy.mockRestore();
			});
			test("should succeed and return a bill", async () => {
				const bill = {};
				const result = await mockStore.bills().create(bill);
				expect(result).toEqual({
					fileUrl: "https://localhost:3456/images/test.jpg",
					key: "1234",
				});
			});
		});
	});
});
