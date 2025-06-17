/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { bills } from "../fixtures/bills.js";
import { formatStatus, formatDate } from "../app/format.js";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
	describe("When I am on Bills Page", () => {
		test("Then bill icon in vertical layout should be highlighted", async () => {
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			await waitFor(() => screen.getByTestId("icon-window"));
			const windowIcon = screen.getByTestId("icon-window");
			//to-do write expect expression
			expect(windowIcon).toHaveClass("active-icon");
		});
		test("Then bills should be ordered from earliest to latest", () => {
			document.body.innerHTML = BillsUI({ data: bills });
			console.log("bill", bills);
			const dates = screen
				.getAllByText(
					/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
				)
				.map((a) => a.innerHTML);
			console.log("date", dates);
			//const antiChrono = (a, b) => (a < b ? 1 : -1);

			const antiChrono = (a, b) => new Date(b.date) - new Date(a.date);
			const datesSorted = [...dates].sort(antiChrono);
			expect(dates).toEqual(datesSorted);
		});

		test("it should set up event listeners", () => {
			const onNavigate = jest.fn();

			document.body.innerHTML = `<button data-testid="btn-new-bill"></button>`;

			const bill = new Bills({
				document: document,
				onNavigate: onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const buttonNewBill = screen.getByTestId("btn-new-bill");
			expect(buttonNewBill).toBeTruthy();
			buttonNewBill.click();
			expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
		});
	});
});
describe("When I am on Bill page and I click on the icon eye", () => {
	test("then a modal should open", () => {
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
		});
		window.localStorage.setItem(
			"user",
			JSON.stringify({
				type: "Employee",
			})
		);
		document.body.innerHTML = BillsUI({ data: bills });

		const onNavigate = (pathname) => {
			document.body.innerHTML = ROUTES({ pathname });
		};
		const bill = new Bills({
			document,
			onNavigate,
			store: mockStore,
			localStorage: window.localStorage,
		});

		const modale = document.getElementById("modaleFile");
		$.fn.modal = jest.fn(() => modale.classList.add("show"));
		const handleClickIconEye = jest.fn(bills.handleClickIconEye);
		const eye = screen.getAllByTestId("icon-eye")[0];
		eye.addEventListener("click", handleClickIconEye);
		userEvent.click(eye);
		expect(handleClickIconEye).toHaveBeenCalled();

		expect(modale).toBeTruthy();
	});
});

describe("Given I am connected as an employee on Bills page", () => {
	let bill;
	const mockStore = {
		bills: jest.fn().mockReturnValue({
			list: jest
				.fn()
				.mockResolvedValue([{ date: "invalid-date", status: "pending" }]),
		}),
	};

	beforeEach(() => {
		bill = new Bills({
			document: document,
			onNavigate: jest.fn(),
			store: mockStore,
			localStorage: {},
		});
	});

	test("should log an error when date formatting fails", async () => {
		const consoleLogSpy = jest.spyOn(console, "log");

		const result = await bill.getBills();

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error), "for", {
			date: "invalid-date",
			status: "pending",
		}); // Vérifie que console.log a été appelé avec les bons arguments

		consoleLogSpy.mockRestore(); // Restaure console.log après le test
	});
});

///////////**********test integration*************/////////////
describe("Given I am a user connected as emploee", () => {
	describe("When I navigate to Bills", () => {
		jest.clearAllMocks();
		test("Then fetches Bills from mock API get", async () => {
			localStorage.setItem(
				"user",
				JSON.stringify({ type: "Employee", email: "a@a" })
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);

			expect(screen.getAllByText("Billed")).toBeTruthy();
			expect(await waitFor(() => screen.getByText("Mes notes de frais")));
			expect(screen.getByTestId("tbody")).toBeTruthy();
			expect(screen.getAllByText("test1")).toBeTruthy();
			expect(screen.getAllByText("test2")).toBeTruthy();
			expect(screen.getAllByText("test3")).toBeTruthy();
			expect(screen.getAllByText("encore")).toBeTruthy();
		});
		describe("When an error occurs on API", () => {
			beforeEach(() => {
				jest.clearAllMocks();
				jest.spyOn(mockStore, "bills");

				Object.defineProperty(window, "localStorage", {
					value: localStorageMock,
				});
				window.localStorage.setItem(
					"user",
					JSON.stringify({
						type: "Employee",
						email: "a@a",
					})
				);
				const root = document.createElement("div");
				root.setAttribute("id", "root");
				document.body.appendChild(root);
				router();
			});

			test("fetches bills from an API and fails with 404 message error", async () => {
				const errorSpy = jest
					.spyOn(console, "error")
					.mockImplementation(() => {});
				await expect(mockStore.bills().list("404")).rejects.toThrow(
					"Erreur 404"
				);
				expect(errorSpy).toHaveBeenCalled();
				const error = errorSpy.mock.calls[0][0];
				expect(error.message).toBe("Erreur 404");

				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);

				errorSpy.mockRestore();
			});

			test("fetches messages from an API and fails with 500 message error", async () => {
				const errorSpy = jest
					.spyOn(console, "error")
					.mockImplementation(() => {});
				await expect(mockStore.bills().list("500")).rejects.toThrow(
					"Erreur 500"
				);
				expect(errorSpy).toHaveBeenCalled();
				const error = errorSpy.mock.calls[0][0];
				expect(error.message).toBe("Erreur 500");

				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);

				errorSpy.mockRestore();
			});
		});
	});
});

describe("Given I am a user connected as Employee", () => {
	describe("When I call getBills", () => {
		test("Then it should return formatted data", async () => {
			// Mock localStorage
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);

			const onNavigate = jest.fn();
			const bill = new Bills({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			mockStore.bills = jest.fn(() => ({
				list: jest.fn(() => Promise.resolve(bills)),
			}));

			const consoleSpy = jest.spyOn(console, "log");

			const result = await bill.getBills();

			expect(consoleSpy).toHaveBeenCalledWith("length", bills.length);

			const expectedResult = bills.map((bill) => ({
				...bill,
				date: formatDate(bill.date),
				status: formatStatus(bill.status),
			}));

			expect(result).toEqual(expectedResult);

			consoleSpy.mockRestore();
			jest.clearAllMocks();
		});
	});
});
