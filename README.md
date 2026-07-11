## 촬영 프로젝트 관리 (신규, 별도 페이지)

배포된 사이트에서 `#projects` 해시를 붙이면 접속됩니다. 예: `https://model-agency-ochre.vercel.app/#projects`
(기존 정산 화면 헤더의 "촬영 프로젝트 관리 →" 버튼으로도 이동 가능하고, 새 화면 헤더의 "모델 정산관리 →" 버튼으로 되돌아올 수 있습니다.)

- 촬영 프로젝트별 총 섭외비용 / 모델 지급비용 / 순수익 월별 관리
- 월별 회사 운영비용 입력 → 회사 순익(운영비 차감 후) 자동 계산
- 연도별 대시보드 (월별 섭외비용·회사 순익 차트)
- 모델 지급관리: 프로젝트에 등록된 모델 내역이 자동으로 지급 목록에 반영되며, 주민등록번호/은행/계좌/공제방식(3.3% 또는 부가세 10%)/입금여부를 관리. 지급 예정일(익월말)이 자동 표시됩니다.

**중요 — 배포 전 1회 설정 필요:** 이 페이지는 기존 정산 시스템과 완전히 분리된 별도의 Google Sheets 탭(`ProjectData`)을 사용합니다. 기존 스프레드시트를 열어 새 시트(탭)를 하나 추가하고 이름을 정확히 `ProjectData`로 지정해주세요. (탭 안 내용은 비워둬도 됩니다 — 앱이 자동으로 채웁니다.) 기존 `Data` 탭에는 전혀 영향을 주지 않습니다.

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
