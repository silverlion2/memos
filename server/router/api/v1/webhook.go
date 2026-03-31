package v1

import (
	"encoding/json"
	"net/http"

	"github.com/labstack/echo/v5"
	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	"github.com/usememos/memos/server/auth"
)

func (s *APIV1Service) HandleWriteWebhook(c echo.Context) error {
	ctx := c.Request().Context()
	token := c.PathParam("token")

	// Webhook token is actually just a Personal Access Token wrapped in the URL
	authenticator := auth.NewAuthenticator(s.Store, s.Secret)
	user, _, err := authenticator.AuthenticateByPAT(ctx, token)
	if err != nil || user == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid or expired token"})
	}

	// Patch context with the authenticated user so the grpc handler succeeds
	ctx = auth.ApplyToContext(ctx, &auth.AuthResult{User: user})

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid JSON body. Expected {\"content\": \"...\"}"})
	}
	if req.Content == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "content cannot be empty"})
	}

	grpcReq := &v1pb.CreateMemoRequest{
		Memo: &v1pb.Memo{
			Content: req.Content,
			// Since Flomo's webhook defaults to normal visibility unless specified, we use Private for privacy-first
			Visibility: v1pb.Visibility_PRIVATE,
		},
	}

	memo, err := s.CreateMemo(ctx, grpcReq)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "success",
		"memo_id": memo.Name,
	})
}
