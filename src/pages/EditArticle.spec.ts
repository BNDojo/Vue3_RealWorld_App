// src/pages/EditArticle.spec.ts
import { createRouter, createWebHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent, render } from '@testing-library/vue'
import fixtures from 'src/utils/test/fixtures'
import { renderOptions, setupMockServer } from 'src/utils/test/test.utils'
import EditArticle from './EditArticle.vue'

describe('# EditArticle page', () => {
  const server = setupMockServer()

  // --- Create a test router to avoid Vue Router warnings ---
  const testRoutes = [
    { path: '/articles', name: 'article-list', component: { template: '<div>Articles</div>' } },
    { path: '/articles/:slug', name: 'article', component: { template: '<div>Article</div>' } },
    { path: '/articles/:slug/edit', name: 'edit-article', component: EditArticle },
  ]
  const testRouter = createRouter({
    history: createWebHistory(),
    routes: testRoutes,
  })

  it('should call create api when fill form and click submit button', async () => {
    server.use([
      'POST',
      '/api/articles',
      { article: { ...fixtures.article, slug: 'article-title' } },
    ])

    vi.spyOn(testRouter, 'push')

    const { getByRole, getByPlaceholderText } = render(EditArticle, await renderOptions({
      router: testRouter,
      initialRoute: '/articles',
    }))

    await testRouter.isReady()

    // Fill form
    await fireEvent.update(getByPlaceholderText('Article Title'), 'Article Title')
    await fireEvent.update(getByPlaceholderText("What's this article about?"), 'Article descriptions')
    await fireEvent.update(getByPlaceholderText('Write your article (in markdown)'), 'this is **article body**.')
    await userEvent.type(getByPlaceholderText('Enter tags'), 'tag1{Enter}tag2{Enter}')

    await fireEvent.click(getByRole('button', { name: 'Publish Article' }))

    const mockedRequest = await server.waitForRequest('POST', '/api/articles')

    expect(testRouter.push).toHaveBeenCalledWith({ name: 'article', params: { slug: 'article-title' } })
    expect(await mockedRequest.json()).toMatchInlineSnapshot(`
      {
        "article": {
          "body": "this is **article body**.",
          "description": "Article descriptions",
          "tagList": [
            "tag1",
            "tag2",
          ],
          "title": "Article Title",
        },
      }
    `)
  })

  it('should call update api when click submit button and in editing', async () => {
    server.use(
      ['GET', '/api/articles/*', { article: fixtures.article }],
      ['PUT', '/api/articles/*', { article: fixtures.article }],
    )

    vi.spyOn(testRouter, 'push')

    const { getByRole, getByPlaceholderText } = render(EditArticle, await renderOptions({
      router: testRouter,
      initialRoute: { name: 'article', params: { slug: 'article-foo' } },
    }))

    await testRouter.isReady()
    await server.waitForRequest('GET', '/api/articles/*')

    await userEvent.type(getByPlaceholderText('Enter tags'), 'tag1{Enter}tag2{Enter}')
    await fireEvent.click(getByRole('button', { name: 'Publish Article' }))

    const mockedRequest = await server.waitForRequest('PUT', '/api/articles/article-foo')

    expect(testRouter.push).toHaveBeenCalledWith({ name: 'article', params: { slug: 'article-foo' } })
    expect(await mockedRequest.json()).toMatchInlineSnapshot(`
      {
        "article": {
          "body": "# Article body

      This is **Strong** content.",
          "description": "Article description",
          "tagList": [
            "foo",
            "tag1",
            "tag2",
          ],
          "title": "Article foo",
        },
      }
    `)
  })

  it('should can remove tag when click remove tag button', async () => {
    server.use(
      ['GET', '/api/articles/*', { article: fixtures.article }],
      ['PUT', '/api/articles/*', { article: fixtures.article }],
    )

    const { getByRole, getByPlaceholderText } = render(EditArticle, await renderOptions({
      router: testRouter,
      initialRoute: { name: 'article', params: { slug: 'article-foo' } },
    }))

    await testRouter.isReady()
    await server.waitForRequest('GET', '/api/articles/*')

    await userEvent.type(getByPlaceholderText('Enter tags'), 'tag1{Enter}tag2{Enter}')
    await userEvent.click(getByRole('button', { name: 'Delete tag: tag1' }))
    await fireEvent.click(getByRole('button', { name: 'Publish Article' }))

    const mockedRequest = await server.waitForRequest('PUT', '/api/articles/article-foo')

    expect(await mockedRequest.json()).toMatchInlineSnapshot(`
      {
        "article": {
          "body": "# Article body

      This is **Strong** content.",
          "description": "Article description",
          "tagList": [
            "foo",
            "tag2",
          ],
          "title": "Article foo",
        },
      }
    `)
  })
})
