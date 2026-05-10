package main

import (
	"log"

	"github.com/kawadhiya21/kwikk/apps/api/internal/http"
)

func main() {
	router := http.NewRouter()
	log.Println("kwikk api listening on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

